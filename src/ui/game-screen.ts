/**
 * Game screen controller. Game state is immutable and owned by the engine;
 * this module keeps the undo stack (previous states) and the transient UI
 * state (mode, wall direction, ghost preview, pending touch placement).
 */
import { applyAction, checkWall, createGame, describeWallRejection, getValidMoves, skippedPlayers } from '../engine';
import type { GameState, Orientation, Position, Wall } from '../engine/types';
import type { HeroDefinition } from '../themes/types';
import { getBoardTheme, getHero, getWallStyle, heroFigureSvg, portraitSvg } from '../themes';
import { BoardView, type Slot } from './board-view';
import { $, esc, heroAnimVars, plural, setPressed } from './dom';
import { undoIcon, wallDirectionIcon } from './icons';
import { closeModal, confettiMarkup, isOpen, openModal } from './modals';
import type { Settings } from './settings';
import { SIDE_TEXT } from './sides';
import type { Toast } from './toast';

type Mode = 'move' | 'wall';

interface PlayerMeta {
  hero: HeroDefinition;
  /** Custom name typed on the setup screen ('' when none). */
  name: string;
  maxWalls: number;
}

export interface GameScreen {
  newGame(settings: Settings): void;
  /** Keyboard shortcuts while the game screen is visible. */
  handleKey(e: KeyboardEvent): void;
  hasGame(): boolean;
}

const WIN_DELAY_MS = 450;
const RESTART_ARM_MS = 2600;

export function createGameScreen(deps: { toast: Toast; onChangeHeroes: () => void }): GameScreen {
  const { toast } = deps;
  const board = new BoardView($<SVGSVGElement>('#board'));
  const turnCard = $('#turnCard');
  const modeMoveBtn = $<HTMLButtonElement>('#modeMove');
  const modeWallBtn = $<HTMLButtonElement>('#modeWall');
  const rotateBtn = $<HTMLButtonElement>('#rotateBtn');
  const undoBtn = $<HTMLButtonElement>('#undoBtn');
  const restartBtn = $<HTMLButtonElement>('#restartBtn');
  const playerList = $('#playerList');
  const winModal = $('#winModal');

  let settings: Settings | null = null;
  let state: GameState | null = null;
  let history: GameState[] = [];
  let meta: PlayerMeta[] = [];
  let mode: Mode = 'move';
  let orient: Orientation = 'h';
  let ghost: Slot | null = null;
  let pending: (Slot & { o: Orientation }) | null = null;
  let lastPointer = 'mouse';
  let newWall: Wall | null = null;
  let winTimer: number | undefined;
  let restartArmed = false;
  let restartTimer: number | undefined;

  undoBtn.innerHTML = `${undoIcon} Undo`;

  const displayName = (i: number): string => {
    const m = meta[i];
    return m ? m.name || m.hero.name : `Player ${i + 1}`;
  };
  const colors = (): string[] => meta.map((m) => m.hero.color);
  const isOver = (): boolean => !state || state.winner !== null;
  const validMoves = (): Position[] => (state && !isOver() ? getValidMoves(state) : []);
  const wallAt = (s: Slot, o: Orientation = orient): Wall => ({ orientation: o, row: s.row, col: s.col });

  // ---------------------------------------------------------------- lifecycle

  function newGame(s: Settings): void {
    settings = s;
    const count = s.count;
    const first = s.first === 'random' ? Math.floor(Math.random() * count) : 0;
    state = createGame({ playerCount: count, wallsPerPlayer: s.walls, firstPlayer: first });
    meta = state.players.map((_, i) => {
      const slot = s.slots[i];
      return { hero: getHero(slot?.hero ?? ''), name: (slot?.name ?? '').trim(), maxWalls: s.walls };
    });
    history = [];
    mode = 'move';
    orient = 'h';
    ghost = null;
    pending = null;
    newWall = null;
    window.clearTimeout(winTimer);
    closeModal(winModal);
    disarmRestart();
    board.build({
      theme: getBoardTheme(s.board),
      wallStyle: getWallStyle(s.wall),
      heroes: meta.map((m) => m.hero),
      size: state.size,
    });
    render();
  }

  // ---------------------------------------------------------------- actions

  function commit(next: GameState, animate: boolean): void {
    if (!state) return;
    const prev = state;
    history.push(prev);
    state = next;
    mode = 'move';
    ghost = null;
    pending = null;
    board.svg.style.cursor = 'default';
    render(animate);
    if (state.winner !== null) {
      window.clearTimeout(winTimer);
      winTimer = window.setTimeout(showWin, WIN_DELAY_MS);
    } else {
      reportSkippedTurns(prev, state);
    }
  }

  /** The engine skips players who cannot act; tell the table about it. */
  function reportSkippedTurns(prev: GameState, next: GameState): void {
    for (const i of skippedPlayers(prev, next)) toast.show(`${displayName(i)} is boxed in and skips a turn.`);
  }

  function doMove(to: Position): void {
    if (!state) return;
    const res = applyAction(state, { type: 'move', to }, displayName);
    if (!res.ok) {
      toast.show(res.error, true);
      return;
    }
    newWall = null;
    commit(res.state, true);
  }

  function doWall(wall: Wall): void {
    if (!state) return;
    const chk = checkWall(state, wall);
    if (!chk.ok) {
      ghost = { row: wall.row, col: wall.col };
      renderGhost();
      toast.show(describeWallRejection(chk, displayName), true);
      return;
    }
    const res = applyAction(state, { type: 'wall', wall }, displayName);
    if (!res.ok) {
      toast.show(res.error, true);
      return;
    }
    newWall = wall;
    commit(res.state, false);
  }

  function undo(): void {
    const prev = history.pop();
    if (!prev) return;
    state = prev;
    mode = 'move';
    ghost = null;
    pending = null;
    newWall = null;
    window.clearTimeout(winTimer);
    closeModal(winModal);
    render();
  }

  function setMode(m: Mode): void {
    if (!state || isOver()) return;
    if (m === 'wall' && (state.players[state.turn]?.wallsLeft ?? 0) <= 0) {
      toast.show('No walls left. Move your hero instead.');
      return;
    }
    mode = m;
    ghost = null;
    pending = null;
    board.svg.style.cursor = 'default';
    render();
  }

  function rotate(): void {
    if (mode !== 'wall') return;
    orient = orient === 'h' ? 'v' : 'h';
    pending = null;
    renderSide();
    renderGhost();
  }

  function disarmRestart(): void {
    restartArmed = false;
    window.clearTimeout(restartTimer);
    restartBtn.textContent = 'Restart';
  }

  // ---------------------------------------------------------------- rendering

  function render(animate = false): void {
    if (!state) return;
    board.render(
      {
        state,
        colors: colors(),
        current: isOver() ? null : state.turn,
        winner: state.winner,
        marks: settings?.hints && mode === 'move' ? validMoves() : [],
        newWall,
      },
      { animate },
    );
    renderGhost();
    renderSide();
  }

  function renderGhost(): void {
    if (!state || !ghost || mode !== 'wall' || isOver()) {
      board.renderGhost(null);
      return;
    }
    const wall = wallAt(ghost);
    board.renderGhost({ wall, ok: checkWall(state, wall).ok });
  }

  function renderSide(): void {
    if (!state) return;
    const turn = state.turn;
    const cur = state.players[turn];
    const m = meta[turn];
    if (!cur || !m) return;
    const h = m.hero;
    const touch = lastPointer !== 'mouse';
    const hint = isOver()
      ? 'Reached the goal!'
      : mode === 'move'
        ? touch ? 'Tap a glowing square to move.' : 'Click a glowing square to move.'
        : touch
          ? pending ? 'Tap the same gap again to build it.' : 'Tap a gap to preview a wall, tap again to build it.'
          : 'Point at a gap and click to build. Right-click or press R to turn the wall.';

    turnCard.style.setProperty('--hc', h.color);
    turnCard.innerHTML = `<div class="turn-portrait">${portraitSvg(h)}</div>
    <div class="turn-text"><span class="eyebrow">Player ${turn + 1} · ${esc(m.name ? h.name : h.title)}</span><strong>${esc(displayName(turn))}${isOver() ? ' wins!' : "'s turn"}</strong><span class="turn-hint">${hint}</span></div>`;

    setPressed(modeMoveBtn, mode === 'move');
    setPressed(modeWallBtn, mode === 'wall');
    modeWallBtn.disabled = cur.wallsLeft <= 0 || isOver();
    modeMoveBtn.disabled = isOver();
    $('#wallCount').textContent = String(cur.wallsLeft);
    rotateBtn.innerHTML = `${wallDirectionIcon(orient)} ${orient === 'h' ? 'Across' : 'Up-down'}`;
    rotateBtn.setAttribute('aria-label', `Wall direction: ${orient === 'h' ? 'across' : 'up and down'}. Press to turn.`);
    rotateBtn.disabled = mode !== 'wall';
    undoBtn.disabled = history.length === 0;

    playerList.innerHTML = state.players
      .map((p, i) => {
        const pm = meta[i];
        if (!pm) return '';
        const pips = Array.from({ length: pm.maxWalls }, (_, k) => `<span class="pip${k < p.wallsLeft ? '' : ' used'}"></span>`).join('');
        return `<li class="pl${i === turn && !isOver() ? ' current' : ''}" style="--hc:${esc(pm.hero.color)}">
      <span class="mini-portrait">${portraitSvg(pm.hero)}</span>
      <div><div class="pl-name">${esc(displayName(i))}</div><div class="pl-meta">P${i + 1} · goal: ${SIDE_TEXT[p.side].goal} · ${plural(p.wallsLeft, 'wall')}</div><div class="pips" aria-hidden="true">${pips}</div></div>
    </li>`;
      })
      .join('');
  }

  function showWin(): void {
    if (!state || state.winner === null) return;
    const w = state.winner;
    const p = state.players[w];
    const m = meta[w];
    if (!p || !m) return;
    const h = m.hero;
    $('#winCard').style.setProperty('--hc', h.color);
    const fig = $('#winFigure');
    fig.setAttribute('style', `--hc:${h.color};${heroAnimVars(h.id)}`);
    fig.innerHTML = heroFigureSvg(h, 'cheer');
    $('#winTitle').textContent = `${displayName(w)} wins!`;
    $('#winSub').textContent = `${m.name ? `${h.name} reached` : 'Reached'} the ${SIDE_TEXT[p.side].goal} in ${plural(p.moves, 'step')}, with ${plural(p.wallsLeft, 'wall')} to spare.`;
    $('#confetti').innerHTML = confettiMarkup([...colors(), '#ffc53d', '#ffffff']);
    openModal(winModal, $('#winAgain'));
  }

  // ---------------------------------------------------------------- input

  const svg = board.svg;
  const isValidMove = (cell: Position): boolean => validMoves().some((v) => v.row === cell.row && v.col === cell.col);

  svg.addEventListener('pointerdown', (e) => {
    lastPointer = e.pointerType || 'mouse';
  });
  svg.addEventListener('pointermove', (e) => {
    if (!state || isOver() || e.pointerType !== 'mouse') return;
    const pt = board.toBoard(e);
    if (!pt) return;
    if (mode === 'wall') {
      const s = board.slotAt(pt);
      if (!s) {
        if (ghost) {
          ghost = null;
          renderGhost();
        }
        svg.style.cursor = 'default';
        return;
      }
      if (!ghost || ghost.row !== s.row || ghost.col !== s.col) {
        ghost = s;
        renderGhost();
      }
      svg.style.cursor = 'pointer';
    } else {
      const cell = board.cellAt(pt);
      svg.style.cursor = cell && isValidMove(cell) ? 'pointer' : 'default';
    }
  });
  svg.addEventListener('pointerleave', (e) => {
    if (e.pointerType === 'mouse' && ghost && mode === 'wall') {
      ghost = null;
      renderGhost();
    }
  });
  svg.addEventListener('click', (e) => {
    if (!state || isOver()) return;
    const pt = board.toBoard(e);
    if (!pt) return;
    if (mode === 'move') {
      const cell = board.cellAt(pt);
      if (!cell) return;
      if (isValidMove(cell)) doMove(cell);
      else {
        const me = state.players[state.turn]?.position;
        if (!(me && me.row === cell.row && me.col === cell.col)) toast.show('Pick one of the glowing squares.');
      }
      return;
    }
    const s = board.slotAt(pt);
    if (!s) return;
    // Touch: the first tap previews, a second tap on the same gap builds.
    if (lastPointer !== 'mouse' && !(pending && pending.row === s.row && pending.col === s.col && pending.o === orient)) {
      pending = { ...s, o: orient };
      ghost = s;
      renderGhost();
      renderSide();
      return;
    }
    doWall(wallAt(s));
  });
  svg.addEventListener('contextmenu', (e) => {
    if (mode !== 'wall') return;
    e.preventDefault();
    rotate();
  });

  modeMoveBtn.addEventListener('click', () => setMode('move'));
  modeWallBtn.addEventListener('click', () => setMode('wall'));
  rotateBtn.addEventListener('click', rotate);
  undoBtn.addEventListener('click', undo);
  $('#winUndo').addEventListener('click', undo);
  $('#winAgain').addEventListener('click', () => settings && newGame(settings));
  $('#winHeroes').addEventListener('click', () => {
    closeModal(winModal);
    deps.onChangeHeroes();
  });
  $('#heroesBtn').addEventListener('click', () => {
    disarmRestart();
    deps.onChangeHeroes();
  });
  restartBtn.addEventListener('click', () => {
    if (!settings) return;
    if (!restartArmed && history.length) {
      restartArmed = true;
      restartBtn.textContent = 'Tap again to restart';
      window.clearTimeout(restartTimer);
      restartTimer = window.setTimeout(disarmRestart, RESTART_ARM_MS);
      return;
    }
    newGame(settings);
  });

  function handleKey(e: KeyboardEvent): void {
    if (!state) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
      e.preventDefault();
      undo();
      return;
    }
    if (isOpen(winModal) || e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (k === 'm') setMode('move');
    else if (k === 'w') setMode('wall');
    else if (k === 'r') rotate();
    else if (k === 'u') undo();
    else if (k === 'escape') {
      ghost = null;
      pending = null;
      renderGhost();
      renderSide();
    }
  }

  return { newGame, handleKey, hasGame: () => state !== null };
}
