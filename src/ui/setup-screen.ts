/**
 * Setup screen: player count, hero cards + roster, board / wall tiles and
 * rule options. Every list here comes from the theme registries, so new
 * heroes, wall styles and boards show up without touching this file.
 */
import { sidesFor } from '../engine';
import { boardThemes, getBoardTheme, getHero, getWallStyle, heroes, heroFigureSvg, miniBoardSvg, portraitSvg, wallStyles } from '../themes';
import { $, $$, esc, heroAnimVars, setPressed } from './dom';
import { fixDuplicateHeroes, MAX_WALLS, MIN_WALLS, NAME_MAX, RULE_WALLS, saveSettings, type PlayerCount, type Settings } from './settings';
import { SIDE_TEXT } from './sides';

export interface SetupScreen {
  render(): void;
}

export function createSetupScreen(settings: Settings, onStart: () => void): SetupScreen {
  const slotsEl = $('#slots');
  const rosterEl = $('#roster');
  const boardOpts = $('#boardOpts');
  const wallOpts = $('#wallOpts');
  let activeSlot = 0;

  const commit = (): void => {
    fixDuplicateHeroes(settings);
    saveSettings(settings);
  };

  function renderSlots(): void {
    const sides = sidesFor(settings.count);
    slotsEl.innerHTML = sides
      .map((side, i) => {
        const slot = settings.slots[i];
        if (!slot) return '';
        const h = getHero(slot.hero);
        const n = i + 1;
        return `<div class="slot${i === activeSlot ? ' active' : ''}" data-slot="${i}" style="--hc:${esc(h.color)}">
      <div class="slot-top"><span class="pnum">P${n}</span><span class="start-side">${SIDE_TEXT[side].start}</span></div>
      <div class="slot-figure" style="${heroAnimVars(h.id)}">${heroFigureSvg(h, 'card-hero')}</div>
      <div class="slot-cycle">
        <button type="button" class="arrow" data-act="prev" aria-label="Previous hero for player ${n}">‹</button>
        <div class="hero-id"><strong>${esc(h.name)}</strong><span>${esc(h.title)}</span></div>
        <button type="button" class="arrow" data-act="next" aria-label="Next hero for player ${n}">›</button>
      </div>
      <input id="pname${i}" type="text" maxlength="${NAME_MAX}" autocomplete="off" placeholder="Name (optional)" value="${esc(slot.name)}" aria-label="Player ${n} name">
    </div>`;
      })
      .join('');
  }

  function renderRoster(): void {
    const owner = new Map<string, number>();
    for (let i = 0; i < settings.count; i++) {
      const s = settings.slots[i];
      if (s) owner.set(s.hero, i);
    }
    rosterEl.innerHTML = heroes
      .map((h) => {
        const o = owner.get(h.id);
        const badge = o !== undefined ? `<span class="taken" style="--tc:${esc(h.color)}">P${o + 1}</span>` : '';
        return `<button type="button" data-hero="${esc(h.id)}" aria-pressed="${o === activeSlot}" title="${esc(h.name)}, ${esc(h.title)}"><span class="mini-portrait">${portraitSvg(h)}</span>${esc(h.name)}${badge}</button>`;
      })
      .join('');
    $('#activeLabel').textContent = `Player ${activeSlot + 1}`;
  }

  function renderOpts(): void {
    const wall = getWallStyle(settings.wall);
    const board = getBoardTheme(settings.board);
    boardOpts.innerHTML = boardThemes
      .map((b) => `<button type="button" class="opt" data-board="${esc(b.id)}" aria-pressed="${board.id === b.id}">${miniBoardSvg(b, wall)}<span>${esc(b.name)}</span></button>`)
      .join('');
    wallOpts.innerHTML = wallStyles
      .map((w) => `<button type="button" class="opt" data-wall="${esc(w.id)}" aria-pressed="${wall.id === w.id}">${miniBoardSvg(board, w)}<span>${esc(w.name)}</span></button>`)
      .join('');
  }

  function renderRules(): void {
    for (const b of $$('[data-count]')) setPressed(b, Number(b.dataset.count) === settings.count);
    for (const b of $$('[data-first]')) setPressed(b, b.dataset.first === settings.first);
    $('#hintsToggle').setAttribute('aria-checked', String(settings.hints));
    $('#wallsOut').textContent = String(settings.walls);
    ($('#wallsMinus') as HTMLButtonElement).disabled = settings.walls <= MIN_WALLS;
    ($('#wallsPlus') as HTMLButtonElement).disabled = settings.walls >= MAX_WALLS;
  }

  function render(): void {
    if (activeSlot >= settings.count) activeSlot = 0;
    renderSlots();
    renderRoster();
    renderOpts();
    renderRules();
  }

  function setActiveSlot(i: number): void {
    activeSlot = i;
    for (const el of $$('.slot', slotsEl)) el.classList.toggle('active', Number(el.dataset.slot) === i);
    renderRoster();
  }

  /** Re-render the hero cards but keep keyboard focus on the same control. */
  function refreshHeroes(focusSelector?: string): void {
    renderSlots();
    renderRoster();
    if (focusSelector) slotsEl.querySelector<HTMLElement>(focusSelector)?.focus();
  }

  function cycleHero(slotIndex: number, dir: 1 | -1): void {
    const slot = settings.slots[slotIndex];
    if (!slot || !heroes.length) return;
    const usedByOthers = new Set(
      settings.slots.slice(0, settings.count).filter((_, i) => i !== slotIndex).map((s) => s.hero),
    );
    let idx = Math.max(0, heroes.findIndex((h) => h.id === slot.hero));
    for (let k = 0; k < heroes.length; k++) {
      idx = (idx + dir + heroes.length) % heroes.length;
      if (!usedByOthers.has(heroes[idx]!.id)) break;
    }
    slot.hero = heroes[idx]!.id;
    commit();
  }

  slotsEl.addEventListener('click', (e) => {
    const target = e.target as Element;
    const slotEl = target.closest<HTMLElement>('.slot');
    if (!slotEl) return;
    const i = Number(slotEl.dataset.slot);
    const act = target.closest<HTMLElement>('[data-act]');
    if (act) {
      activeSlot = i;
      const dir = act.dataset.act === 'next' ? 1 : -1;
      cycleHero(i, dir);
      refreshHeroes(`.slot[data-slot="${i}"] [data-act="${act.dataset.act}"]`);
      return;
    }
    if (i !== activeSlot) setActiveSlot(i);
  });
  slotsEl.addEventListener('focusin', (e) => {
    const target = e.target as HTMLElement;
    const slotEl = target.closest<HTMLElement>('.slot');
    if (slotEl && target.tagName === 'INPUT' && Number(slotEl.dataset.slot) !== activeSlot) setActiveSlot(Number(slotEl.dataset.slot));
  });
  slotsEl.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    const slotEl = target.closest<HTMLElement>('.slot');
    const slot = slotEl ? settings.slots[Number(slotEl.dataset.slot)] : undefined;
    if (slot && target.tagName === 'INPUT') {
      slot.name = target.value.slice(0, NAME_MAX);
      saveSettings(settings);
    }
  });

  rosterEl.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-hero]');
    const id = b?.dataset.hero;
    const active = settings.slots[activeSlot];
    if (!id || !active) return;
    // Swap with whoever already has this hero, so heroes stay unique.
    const other = settings.slots.slice(0, settings.count).findIndex((s, i) => s.hero === id && i !== activeSlot);
    if (other >= 0) settings.slots[other]!.hero = active.hero;
    active.hero = id;
    commit();
    refreshHeroes();
    rosterEl.querySelector<HTMLElement>(`[data-hero="${CSS.escape(id)}"]`)?.focus();
  });

  for (const b of $$('[data-count]')) {
    b.addEventListener('click', () => {
      const n = Number(b.dataset.count) as PlayerCount;
      if (n === settings.count) return;
      settings.count = n;
      settings.walls = RULE_WALLS[n];
      commit();
      render();
    });
  }
  boardOpts.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-board]');
    if (!b?.dataset.board) return;
    settings.board = b.dataset.board;
    saveSettings(settings);
    renderOpts();
    boardOpts.querySelector<HTMLElement>(`[data-board="${CSS.escape(settings.board)}"]`)?.focus();
  });
  wallOpts.addEventListener('click', (e) => {
    const b = (e.target as Element).closest<HTMLElement>('[data-wall]');
    if (!b?.dataset.wall) return;
    settings.wall = b.dataset.wall;
    saveSettings(settings);
    renderOpts();
    wallOpts.querySelector<HTMLElement>(`[data-wall="${CSS.escape(settings.wall)}"]`)?.focus();
  });
  $('#hintsToggle').addEventListener('click', () => {
    settings.hints = !settings.hints;
    saveSettings(settings);
    renderRules();
  });
  for (const b of $$('[data-first]')) {
    b.addEventListener('click', () => {
      settings.first = b.dataset.first === 'random' ? 'random' : 'p1';
      saveSettings(settings);
      renderRules();
    });
  }
  $('#wallsMinus').addEventListener('click', () => {
    settings.walls = Math.max(MIN_WALLS, settings.walls - 1);
    saveSettings(settings);
    renderRules();
  });
  $('#wallsPlus').addEventListener('click', () => {
    settings.walls = Math.min(MAX_WALLS, settings.walls + 1);
    saveSettings(settings);
    renderRules();
  });
  $('#startBtn').addEventListener('click', onStart);

  return { render };
}
