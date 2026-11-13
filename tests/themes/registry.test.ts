import { describe, expect, it } from 'vitest';
import {
  boardThemes,
  declaredIds,
  getBoardTheme,
  getHero,
  getWallStyle,
  heroes,
  validateContent,
  wallStyles,
} from '../../src/themes';
import type { HeroDefinition } from '../../src/themes';

describe('content registry', () => {
  // Content-agnostic on purpose: adding a hero / wall / board must not need a test edit.
  it('finds at least one hero, wall style and board theme', () => {
    expect(heroes.length).toBeGreaterThanOrEqual(1);
    expect(wallStyles.length).toBeGreaterThanOrEqual(1);
    expect(boardThemes.length).toBeGreaterThanOrEqual(1);
  });

  it('includes all the prototype content with its data', () => {
    expect(heroes.map((h) => h.id)).toEqual(
      expect.arrayContaining(['knight', 'princess', 'wizard', 'dragon', 'ranger', 'pirate', 'fox', 'bear']),
    );
    const proto: [string, string, string][] = [
      ['knight', 'Sir Pip', '#3d7bfd'],
      ['princess', 'Princess Rosa', '#ec5a9e'],
      ['wizard', 'Merlo', '#8b5cf6'],
      ['dragon', 'Ember', '#22b36d'],
      ['ranger', 'Wren', '#13a3a3'],
      ['pirate', 'Captain Coral', '#e5484d'],
      ['fox', 'Fennel', '#f2711c'],
      ['bear', 'Bruno', '#d39b14'],
    ];
    for (const [id, name, color] of proto) {
      const h = getHero(id);
      expect(h.id).toBe(id);
      expect([h.name, h.color]).toEqual([name, color]);
    }
    for (const [id, name] of [['hedge', 'Hedge'], ['stone', 'Stone'], ['wood', 'Fence'], ['crystal', 'Crystal']] as const) {
      const w = getWallStyle(id);
      expect([w.id, w.name]).toEqual([id, name]);
    }
    for (const id of ['meadow', 'castle', 'frost', 'starlight']) expect(getBoardTheme(id).id).toBe(id);
  });

  it('keeps the prototype content in prototype order relative to each other', () => {
    const rel = (ids: string[], keep: string[]) => ids.filter((id) => keep.includes(id));
    const heroOrder = ['knight', 'princess', 'wizard', 'dragon', 'ranger', 'pirate', 'fox', 'bear'];
    expect(rel(heroes.map((h) => h.id), heroOrder)).toEqual(heroOrder);
    const wallOrder = ['hedge', 'stone', 'wood', 'crystal'];
    expect(rel(wallStyles.map((w) => w.id), wallOrder)).toEqual(wallOrder);
    const boardOrder = ['meadow', 'castle', 'frost', 'starlight'];
    expect(rel(boardThemes.map((b) => b.id), boardOrder)).toEqual(boardOrder);
  });

  it('every list is sorted by order, then name', () => {
    for (const list of [heroes, wallStyles, boardThemes] as readonly (readonly { order?: number; name: string }[])[]) {
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1]!;
        const b = list[i]!;
        const oa = a.order ?? Number.POSITIVE_INFINITY;
        const ob = b.order ?? Number.POSITIVE_INFINITY;
        expect(oa < ob || (oa === ob && a.name.localeCompare(b.name) <= 0), `${a.name} before ${b.name}`).toBe(true);
      }
    }
  });

  it('has unique, kebab-case ids', () => {
    for (const list of [heroes, wallStyles, boardThemes]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    }
  });

  it('every hero has a title, hex colour and non-empty portrait', () => {
    for (const h of heroes) {
      expect(h.title.length).toBeGreaterThan(0);
      expect(h.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(h.portrait.markup.trim().length).toBeGreaterThan(0);
    }
  });

  it('getX returns the item by id and falls back to the first one', () => {
    expect(getHero('fox').id).toBe('fox');
    expect(getHero('nobody')).toBe(heroes[0]);
    expect(getHero(undefined)).toBe(heroes[0]);
    expect(getWallStyle('crystal').id).toBe('crystal');
    expect(getWallStyle('lava')).toBe(wallStyles[0]);
    expect(getBoardTheme('frost').id).toBe('frost');
    expect(getBoardTheme(null)).toBe(boardThemes[0]);
  });

  it('validateContent reports duplicate ids and badly prefixed defs', () => {
    const a: HeroDefinition = { id: 'a', name: 'A', title: 'x', color: '#000000', portrait: { markup: '', defs: '<g id="a-ok"/><g id="bad"/>' } };
    const res = validateContent('hero', [a, a]);
    expect(res.errors).toEqual(['Duplicate hero id "a"']);
    expect(res.warnings.some((w) => w.includes('"bad"'))).toBe(true);
    expect(res.warnings.some((w) => w.includes('a-ok'))).toBe(false);
  });

  it('declaredIds finds ids', () => {
    expect(declaredIds('<linearGradient id="x-1"/><filter id=\'x-2\'/>')).toEqual(['x-1', 'x-2']);
  });
});
