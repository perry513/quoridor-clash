/**
 * Setup choices, remembered per browser. Every content id is validated
 * against the theme registries on load, so removing a hero, wall style or
 * board theme never breaks a saved setup: it quietly falls back.
 */
import { boardThemes, heroes, wallStyles } from '../themes';

export type PlayerCount = 2 | 4;
export type FirstPlayer = 'p1' | 'random';

export interface SlotSetting {
  hero: string;
  name: string;
}

export interface Settings {
  count: PlayerCount;
  /** Always MAX_PLAYERS entries; only the first `count` are used. */
  slots: SlotSetting[];
  board: string;
  wall: string;
  hints: boolean;
  first: FirstPlayer;
  walls: number;
}

export const MAX_PLAYERS = 4;
export const MIN_WALLS = 1;
export const MAX_WALLS = 15;
export const NAME_MAX = 14;
/** Classic wall supply per player for each player count. */
export const RULE_WALLS: Record<PlayerCount, number> = { 2: 10, 4: 5 };

const STORAGE_KEY = 'qq-settings';

const heroExists = (id: unknown): id is string => typeof id === 'string' && heroes.some((h) => h.id === id);
const boardExists = (id: unknown): id is string => typeof id === 'string' && boardThemes.some((b) => b.id === id);
const wallExists = (id: unknown): id is string => typeof id === 'string' && wallStyles.some((w) => w.id === id);

/** Default hero for slot i: the registry's i-th hero (heroes are already sorted by `order`). */
function defaultHero(i: number): string {
  return heroes[i % Math.max(1, heroes.length)]?.id ?? '';
}

export function defaultSettings(): Settings {
  return {
    count: 2,
    slots: Array.from({ length: MAX_PLAYERS }, (_, i) => ({ hero: defaultHero(i), name: '' })),
    board: boardThemes[0]?.id ?? '',
    wall: wallStyles[0]?.id ?? '',
    hints: true,
    first: 'p1',
    walls: RULE_WALLS[2],
  };
}

function clampWalls(n: unknown, fallback: number): number {
  const v = typeof n === 'number' ? n : parseInt(String(n), 10);
  if (!Number.isFinite(v)) return fallback;
  return Math.min(MAX_WALLS, Math.max(MIN_WALLS, Math.round(v)));
}

function sanitize(raw: unknown): Settings {
  const d = defaultSettings();
  if (!raw || typeof raw !== 'object') return d;
  const r = raw as Record<string, unknown>;
  const count: PlayerCount = r.count === 4 ? 4 : 2;
  const rawSlots = Array.isArray(r.slots) ? (r.slots as unknown[]) : [];
  const slots = d.slots.map((def, i) => {
    const s = rawSlots[i] as Record<string, unknown> | undefined;
    return {
      hero: heroExists(s?.hero) ? s.hero : def.hero,
      name: typeof s?.name === 'string' ? s.name.slice(0, NAME_MAX) : '',
    };
  });
  const out: Settings = {
    count,
    slots,
    board: boardExists(r.board) ? r.board : d.board,
    wall: wallExists(r.wall) ? r.wall : d.wall,
    hints: r.hints !== false,
    first: r.first === 'random' ? 'random' : 'p1',
    walls: clampWalls(r.walls, RULE_WALLS[count]),
  };
  fixDuplicateHeroes(out);
  return out;
}

export function loadSettings(): Settings {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    if (text) return sanitize(JSON.parse(text));
  } catch {
    /* storage unavailable or corrupt: use defaults */
  }
  const d = defaultSettings();
  fixDuplicateHeroes(d);
  return d;
}

export function saveSettings(s: Settings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore (private mode, quota, blocked storage) */
  }
}

/** Make every slot's hero unique (when the registry has enough heroes). Mutates `s`. */
export function fixDuplicateHeroes(s: Settings): void {
  const used = new Set<string>();
  for (const slot of s.slots) {
    if (used.has(slot.hero)) {
      const free = heroes.find((h) => !used.has(h.id));
      if (free) slot.hero = free.id;
    }
    used.add(slot.hero);
  }
}
