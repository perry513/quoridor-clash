/**
 * SVG board renderer + pointer mapping. Knows nothing about game rules: the
 * game screen hands it a scene (state, colours, marks...) and asks it to map
 * pointer positions back to cells and wall slots.
 *
 * Layers (bottom to top): background, goals, marks, walls, pawns, ghost.
 * Marks sit under the pawns so tall hero figures overlap the move dots in front of them.
 */
import type { GameState, Position, Side, Wall } from '../engine/types';
import type { BoardTheme, HeroDefinition, WallStyle } from '../themes/types';
import { BOARD_GEOMETRY, boardBackgroundSvg, heroFigureSvg, wallSvg } from '../themes';
import { esc, heroAnimVars, prefersReducedMotion } from './dom';

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Figure size on the board (figures use a 0 0 100 130 box). */
const FIG_W = 76;
const FIG_H = FIG_W * 1.3;
/** Where the figure's base centre sits inside its 100x130 box. */
const FIG_BASE_Y = (114.5 / 130) * FIG_H;
/** The base centre is placed this far below the cell centre. */
const FOOT_OFFSET = 14;
const HOP_MS = 420;

export interface BoardScene {
  state: GameState;
  /** Signature colour of each player (index-aligned with state.players). */
  colors: readonly string[];
  /** Player whose turn it is, or null when the game is over. */
  current: number | null;
  winner: number | null;
  /** Cells to mark as valid moves (empty to hide hints). */
  marks: readonly Position[];
  /** Wall that was just built (gets a drop-in animation). */
  newWall: Wall | null;
}

export interface Slot {
  row: number;
  col: number;
}

export interface BoardBuild {
  theme: BoardTheme;
  wallStyle: WallStyle;
  heroes: readonly HeroDefinition[];
  size: number;
}

export class BoardView {
  readonly svg: SVGSVGElement;
  private size = 9;
  private wallStyle: WallStyle | null = null;
  private pawns: SVGGElement[] = [];
  private lastPositions: (Position | null)[] = [];
  private hopTimers = new Map<SVGGElement, number>();
  private layers: Record<'goals' | 'walls' | 'pawns' | 'marks' | 'ghost', SVGGElement> | null = null;

  constructor(svg: SVGSVGElement) {
    this.svg = svg;
  }

  get geometry(): { cell: number; gap: number; frame: number; step: number; inner: number; total: number } {
    const { cell, gap, frame } = BOARD_GEOMETRY;
    const inner = this.size * cell + (this.size - 1) * gap;
    return { cell, gap, frame, step: cell + gap, inner, total: inner + 2 * frame };
  }

  /** Top-left corner of a cell in board units. */
  cellOrigin(row: number, col: number): { x: number; y: number } {
    const g = this.geometry;
    return { x: g.frame + col * g.step, y: g.frame + row * g.step };
  }

  cellCenterOf(row: number, col: number): { x: number; y: number } {
    const o = this.cellOrigin(row, col);
    const half = this.geometry.cell / 2;
    return { x: o.x + half, y: o.y + half };
  }

  /** (Re)build the static board and the pieces for a new game. */
  build(b: BoardBuild): void {
    this.size = b.size;
    this.wallStyle = b.wallStyle;
    const g = this.geometry;
    this.svg.setAttribute('viewBox', `0 0 ${g.total} ${g.total}`);
    this.svg.innerHTML =
      `<g class="layer-bg">${boardBackgroundSvg(b.theme, { size: b.size, decorate: true })}</g>` +
      '<g class="layer-goals"></g><g class="layer-marks"></g><g class="layer-walls"></g>' +
      '<g class="layer-pawns"></g><g class="layer-ghost"></g>';

    // The background helper may return a fragment or a full <svg>; size a nested one to the board.
    const nested = this.svg.querySelector('.layer-bg > svg');
    if (nested) {
      nested.setAttribute('width', String(g.total));
      nested.setAttribute('height', String(g.total));
    }

    const layer = (cls: string): SVGGElement => this.svg.querySelector<SVGGElement>(`.${cls}`)!;
    this.layers = {
      goals: layer('layer-goals'),
      walls: layer('layer-walls'),
      pawns: layer('layer-pawns'),
      marks: layer('layer-marks'),
      ghost: layer('layer-ghost'),
    };

    for (const t of this.hopTimers.values()) window.clearTimeout(t);
    this.hopTimers.clear();
    this.pawns = b.heroes.map((hero, i) => {
      const pawn = document.createElementNS(SVG_NS, 'g');
      pawn.setAttribute('class', 'pawn');
      pawn.dataset.i = String(i);
      pawn.setAttribute('style', heroAnimVars(hero.id));
      pawn.innerHTML = heroFigureSvg(hero, 'board-hero');
      const fig = pawn.querySelector('svg');
      if (fig) {
        fig.setAttribute('x', (-FIG_W / 2).toFixed(2));
        fig.setAttribute('y', (-FIG_BASE_Y).toFixed(2));
        fig.setAttribute('width', FIG_W.toFixed(2));
        fig.setAttribute('height', FIG_H.toFixed(2));
        fig.setAttribute('overflow', 'visible');
        fig.setAttribute('aria-hidden', 'true');
      }
      return pawn;
    });
    this.layers.pawns.replaceChildren(...this.pawns);
    this.lastPositions = this.pawns.map(() => null);
  }

  /** Draw the dynamic layers. With `animate`, a pawn that moved hops to its new cell. */
  render(scene: BoardScene, opts: { animate?: boolean } = {}): void {
    if (!this.layers || !this.wallStyle) return;
    this.layers.goals.innerHTML = this.goalsMarkup(scene);
    this.layers.walls.innerHTML = scene.state.walls
      .map((w) => wallSvg(this.wallStyle!, w, { className: sameWall(w, scene.newWall) ? 'wall-new' : '' }))
      .join('');

    const markColor = scene.current !== null ? (scene.colors[scene.current] ?? '#ffffff') : '#ffffff';
    this.layers.marks.innerHTML = scene.marks
      .map((p) => {
        const c = this.cellCenterOf(p.row, p.col);
        return `<circle class="mark" cx="${c.x}" cy="${c.y - 2}" r="11" fill="${esc(markColor)}" stroke="#fff" stroke-width="3.5"/>`;
      })
      .join('');

    this.renderPawns(scene, opts.animate === true);
  }

  private renderPawns(scene: BoardScene, animate: boolean): void {
    const players = scene.state.players;
    const reduced = prefersReducedMotion();

    // Draw order: lower rows in front; ties keep the current player in front.
    const order = this.pawns
      .map((_, i) => i)
      .filter((i) => players[i])
      .sort((a, b) => {
        const ra = players[a]!.position.row;
        const rb = players[b]!.position.row;
        if (ra !== rb) return ra - rb;
        return (a === scene.current ? 1 : 0) - (b === scene.current ? 1 : 0) || a - b;
      });
    const layer = this.layers!.pawns;
    const currentOrder = Array.from(layer.children);
    if (order.some((i, k) => currentOrder[k] !== this.pawns[i])) {
      // Moving nodes restarts their CSS animations, so only re-append when the order really changed.
      for (const i of order) layer.appendChild(this.pawns[i]!);
    }

    players.forEach((p, i) => {
      const pawn = this.pawns[i];
      if (!pawn) return;
      const prev = this.lastPositions[i];
      const to = this.pawnTransform(p.position);
      const moved = prev && (prev.row !== p.position.row || prev.col !== p.position.col);
      pawn.style.transform = to;
      if (moved && animate && !reduced && prev) this.hop(pawn, this.pawnTransform(prev), to);
      this.lastPositions[i] = { ...p.position };
      pawn.classList.toggle('current', i === scene.current);
      pawn.classList.toggle('winner', i === scene.winner);
    });
  }

  private pawnTransform(pos: Position): string {
    const c = this.cellCenterOf(pos.row, pos.col);
    return `translate(${c.x}px, ${c.y + FOOT_OFFSET}px)`;
  }

  private hop(pawn: SVGGElement, from: string, to: string): void {
    if (typeof pawn.animate === 'function') {
      pawn.animate([{ transform: from }, { transform: to }], {
        duration: HOP_MS,
        easing: 'cubic-bezier(.35,.1,.3,1)',
      });
    }
    pawn.classList.remove('hopping');
    void pawn.getBoundingClientRect(); // restart the CSS hop animation
    pawn.classList.add('hopping');
    window.clearTimeout(this.hopTimers.get(pawn));
    this.hopTimers.set(
      pawn,
      window.setTimeout(() => pawn.classList.remove('hopping'), HOP_MS + 40),
    );
  }

  private goalsMarkup(scene: BoardScene): string {
    const g = this.geometry;
    const last = this.size - 1;
    let s = '';
    scene.state.players.forEach((p, i) => {
      const color = esc(scene.colors[i] ?? '#ffffff');
      const cur = i === scene.current;
      const strip = goalStrip(p.side, g.frame, g.inner);
      s += `<rect class="goal-strip" x="${strip.x}" y="${strip.y}" width="${strip.w}" height="${strip.h}" rx="3.5" fill="${color}" stroke="#fff" stroke-width="${cur ? 2 : 0}" opacity="${cur ? 1 : 0.45}"/>`;
      if (!cur) return;
      for (let k = 0; k < this.size; k++) {
        const cell = goalCell(p.side, k, last);
        const o = this.cellOrigin(cell.row, cell.col);
        s += `<rect class="goal-cell" x="${o.x}" y="${o.y}" width="${g.cell}" height="${g.cell - 4}" rx="9" fill="${color}" opacity=".22"/>`;
      }
    });
    return s;
  }

  /** Preview of a wall being placed (null clears it). */
  renderGhost(ghost: { wall: Wall; ok: boolean } | null): void {
    if (!this.layers || !this.wallStyle) return;
    this.layers.ghost.innerHTML = ghost
      ? wallSvg(this.wallStyle, ghost.wall, { className: ghost.ok ? 'ghost-ok' : 'ghost-bad', invalid: !ghost.ok })
      : '';
  }

  /** Client (pointer) coordinates to board units. */
  toBoard(e: { clientX: number; clientY: number }): DOMPoint | null {
    const m = this.svg.getScreenCTM();
    if (!m) return null;
    return new DOMPoint(e.clientX, e.clientY).matrixTransform(m.inverse());
  }

  /** The cell under a board point (each cell's hit area includes half of the surrounding gaps). */
  cellAt(pt: { x: number; y: number }): Position | null {
    const g = this.geometry;
    const col = Math.floor((pt.x - g.frame + g.gap / 2) / g.step);
    const row = Math.floor((pt.y - g.frame + g.gap / 2) / g.step);
    return row >= 0 && row < this.size && col >= 0 && col < this.size ? { row, col } : null;
  }

  /** The nearest wall slot (grid intersection) to a board point, or null when outside the play area. */
  slotAt(pt: { x: number; y: number }): Slot | null {
    const g = this.geometry;
    const lo = g.frame - g.gap;
    const hi = g.frame + g.inner + g.gap;
    if (pt.x < lo || pt.y < lo || pt.x > hi || pt.y > hi) return null;
    const clamp = (v: number): number => Math.max(0, Math.min(this.size - 2, v));
    return {
      row: clamp(Math.round((pt.y - g.frame - g.cell - g.gap / 2) / g.step)),
      col: clamp(Math.round((pt.x - g.frame - g.cell - g.gap / 2) / g.step)),
    };
  }
}

function sameWall(a: Wall, b: Wall | null): boolean {
  return !!b && a.orientation === b.orientation && a.row === b.row && a.col === b.col;
}

/** The glowing strip along the edge a player must reach. */
function goalStrip(side: Side, frame: number, inner: number): { x: number; y: number; w: number; h: number } {
  switch (side) {
    case 'bottom':
      return { x: frame, y: frame - 16, w: inner, h: 7 }; // goal: top edge
    case 'top':
      return { x: frame, y: frame + inner + 9, w: inner, h: 7 }; // goal: bottom edge
    case 'left':
      return { x: frame + inner + 9, y: frame, w: 7, h: inner }; // goal: right edge
    case 'right':
      return { x: frame - 16, y: frame, w: 7, h: inner }; // goal: left edge
  }
}

/** The k-th cell of a player's goal edge. */
function goalCell(side: Side, k: number, last: number): Position {
  switch (side) {
    case 'bottom':
      return { row: 0, col: k };
    case 'top':
      return { row: last, col: k };
    case 'left':
      return { row: k, col: last };
    case 'right':
      return { row: k, col: 0 };
  }
}
