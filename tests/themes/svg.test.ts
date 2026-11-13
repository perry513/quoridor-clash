import { describe, expect, it } from 'vitest';
import {
  BOARD_GEOMETRY,
  SHARED_DEFS,
  allDefsMarkup,
  boardBackgroundSvg,
  boardPixelSize,
  boardThemes,
  cellCenter,
  cellPosition,
  declaredIds,
  getBoardTheme,
  getHero,
  getWallStyle,
  heroFigureSvg,
  heroes,
  miniBoardSvg,
  portraitSvg,
  referencedIds,
  wallStyles,
  wallSvg,
} from '../../src/themes';
import type { HeroDefinition } from '../../src/themes';

const sharedIds = new Set(declaredIds(SHARED_DEFS));

function defsOf(item: { id: string; defs?: string } | HeroDefinition): string[] {
  if ('portrait' in item) return [item.portrait.defs ?? '', item.figure?.defs ?? ''];
  return [item.defs ?? ''];
}

/** Ids each item's markup may reference: its own defs + shared. */
function allowedIds(defs: string[]): Set<string> {
  return new Set([...sharedIds, ...defs.flatMap((d) => declaredIds(d))]);
}

function unresolved(markup: string, allowed: Set<string>): string[] {
  return referencedIds(markup).filter((id) => !allowed.has(id));
}

describe('defs ids', () => {
  it('shared defs ids all start with "sh-" and include the portrait clip', () => {
    expect(sharedIds.size).toBeGreaterThan(5);
    for (const id of sharedIds) expect(id.startsWith('sh-')).toBe(true);
    expect(sharedIds.has('sh-portrait-clip')).toBe(true);
  });

  it('every content defs id is prefixed "<id>-" (or "sh-")', () => {
    for (const item of [...heroes, ...wallStyles, ...boardThemes]) {
      for (const d of defsOf(item)) {
        for (const id of declaredIds(d)) {
          expect(id.startsWith(item.id + '-') || id.startsWith('sh-'), `${item.id}: ${id}`).toBe(true);
        }
      }
    }
  });

  it('allDefsMarkup has no duplicate ids', () => {
    const ids = declaredIds(allDefsMarkup());
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('references resolve', () => {
  it('hero portrait and figure markup only reference own or shared defs', () => {
    for (const h of heroes) {
      const allowed = allowedIds(defsOf(h));
      expect(unresolved(h.portrait.markup, allowed), h.id).toEqual([]);
      if (h.figure) expect(unresolved(h.figure.markup, allowed), h.id).toEqual([]);
      expect(unresolved(portraitSvg(h), allowed), h.id).toEqual([]);
      expect(unresolved(heroFigureSvg(h), allowed), h.id).toEqual([]);
    }
  });

  it('wall and board markup only reference own or shared defs', () => {
    for (const w of wallStyles) {
      const out = wallSvg(w, { orientation: 'h', row: 0, col: 0 });
      expect(unresolved(out, allowedIds(defsOf(w))), w.id).toEqual([]);
    }
    for (const b of boardThemes) {
      expect(unresolved(boardBackgroundSvg(b), allowedIds(defsOf(b))), b.id).toEqual([]);
    }
  });

  it('every reference in any rendered output resolves inside allDefsMarkup', () => {
    const all = new Set(declaredIds(allDefsMarkup()));
    let out = '';
    for (const h of heroes) out += portraitSvg(h) + heroFigureSvg(h);
    for (const b of boardThemes) for (const w of wallStyles) out += miniBoardSvg(b, w);
    expect(unresolved(out, all)).toEqual([]);
  });

  it('content markup obeys the SVG rules (no script/image/text/external urls)', () => {
    const bad = /<(script|image|text|svg|defs)\b|https?:|javascript:/i;
    for (const h of heroes) {
      expect(bad.test(h.portrait.markup), h.id).toBe(false);
      if (h.figure) expect(bad.test(h.figure.markup), h.id).toBe(false);
    }
    for (const w of wallStyles) expect(bad.test(w.render(122, 18)), w.id).toBe(false);
  });
});

describe('hero figures', () => {
  it('heroes with a figure contain all class hooks and a --pivot', () => {
    // Figures are optional; v1 ships every hero as a portrait token (see art/future/).
    const withFigure = heroes.filter((h) => h.figure);
    for (const h of withFigure) {
      const svg = heroFigureSvg(h);
      for (const hook of ['hero-shadow', 'hero-figure', 'hero-eyes', 'hero-arm']) {
        expect(svg, `${h.id} ${hook}`).toMatch(new RegExp(`class="[^"]*\\b${hook}\\b`));
      }
      expect(h.figure?.markup).toMatch(/--pivot:\s*[\d.]+% [\d.]+%/);
    }
  });

  it('fallback figure contains the portrait token and class hooks', () => {
    const wizard = heroes.find((h) => h.id === 'wizard');
    expect(wizard?.figure).toBeUndefined();
    const svg = heroFigureSvg(wizard as HeroDefinition, 'extra');
    expect(svg).toMatch(/^<svg viewBox="0 0 100 130" class="hero hero-wizard hero-token extra"/);
    expect(svg).toContain('class="hero-figure"');
    expect(svg).toContain('class="hero-shadow"');
    expect(svg).toContain('class="hero-eyes"');
    expect(svg).toContain('url(#sh-portrait-clip)');
    expect(svg).toContain(wizard?.color);
  });

  it('portraitSvg wraps the art in a clipped 100x100 circle', () => {
    const h = getHero('knight');
    const svg = portraitSvg(h, 'big');
    expect(svg).toMatch(/^<svg viewBox="0 0 100 100" class="portrait portrait-knight big"/);
    expect(svg).toContain(`fill="${h.color}"`);
    expect(svg).toContain('url(#sh-bd-light)');
  });
});

describe('geometry and board', () => {
  it('board is 712 units and cells are placed on a 74-unit step', () => {
    expect(boardPixelSize()).toBe(712);
    expect(cellPosition(0, 0)).toEqual({ x: 30, y: 30 });
    expect(cellPosition(2, 1)).toEqual({ x: 104, y: 178 });
    expect(cellCenter(8, 8)).toEqual({ x: 30 + 8 * 74 + 30, y: 30 + 8 * 74 + 30 });
    expect(BOARD_GEOMETRY).toEqual({ cell: 60, gap: 14, frame: 30 });
  });

  it('board background draws 81 cells x 2 rects and is deterministic', () => {
    const b = getBoardTheme('meadow');
    const a1 = boardBackgroundSvg(b);
    expect(a1).toBe(boardBackgroundSvg(b));
    expect(a1.match(/rx="9"/g)).toHaveLength(162);
    const plain = boardBackgroundSvg(b, { decorate: false });
    expect(plain.length).toBeLessThan(a1.length);
    expect(boardBackgroundSvg(b, { size: 3, decorate: false }).match(/rx="9"/g)).toHaveLength(18);
  });

  it('every theme uses its own colours', () => {
    for (const b of boardThemes) {
      const s = boardBackgroundSvg(b);
      expect(s).toContain(b.cellA);
      expect(s).toContain(b.frame);
    }
  });
});

describe('walls', () => {
  const style = getWallStyle('hedge');

  it('horizontal wall sits in the gap below the row', () => {
    const s = wallSvg(style, { orientation: 'h', row: 2, col: 3 });
    // x = 30 + 3*74 + 3 = 255, y = 30 + 2*74 + 60 - 2 = 236
    expect(s).toContain('transform="translate(255,236)"');
    expect(s).toContain('<rect x="255" y="239" width="128" height="18"');
    expect(s).not.toContain('rotate(');
  });

  it('vertical wall is rotated into the gap right of the column', () => {
    const s = wallSvg(style, { orientation: 'v', row: 2, col: 3 });
    // x = 30 + 3*74 + 60 - 2 = 310, y = 30 + 2*74 + 3 = 181
    expect(s).toContain('transform="translate(328,181) rotate(90)"');
    expect(s).toContain('<rect x="310" y="184" width="18" height="128"');
  });

  it('invalid adds a red overlay and classes are applied', () => {
    const s = wallSvg(style, { orientation: 'h', row: 0, col: 0 }, { invalid: true, className: 'ghost' });
    expect(s).toContain('fill="#ff3b3b"');
    expect(s).toMatch(/^<g class="wall wall-hedge wall-invalid ghost">/);
    expect(wallSvg(style, { orientation: 'h', row: 0, col: 0 })).not.toContain('#ff3b3b');
  });

  it('mini board renders for every board/wall combo', () => {
    for (const b of boardThemes) {
      for (const w of wallStyles) {
        const s = miniBoardSvg(b, w);
        expect(s).toMatch(/^<svg viewBox="0 0 244 244"/);
        expect(s.match(/class="wall /g)).toHaveLength(2);
      }
    }
  });
});
