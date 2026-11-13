/**
 * Auto-registration of pluggable content. Every file matching the globs below is
 * picked up at build time, so adding content never requires editing this file.
 *
 *   src/themes/heroes/<id>/index.ts  -> HeroDefinition
 *   src/themes/walls/<id>.ts         -> WallStyle
 *   src/themes/boards/<id>.ts        -> BoardTheme
 */
import type { BoardTheme, HeroDefinition, WallStyle } from './types';

interface Registrable {
  id: string;
  name: string;
  order?: number;
}

const heroModules = import.meta.glob<HeroDefinition>('./heroes/*/index.ts', { eager: true, import: 'default' });
const wallModules = import.meta.glob<WallStyle>('./walls/*.ts', { eager: true, import: 'default' });
const boardModules = import.meta.glob<BoardTheme>('./boards/*.ts', { eager: true, import: 'default' });

/** Lower `order` first; items without an order go last; ties broken by name. */
export function sortContent<T extends Registrable>(items: readonly T[]): T[] {
  const ord = (x: Registrable) => x.order ?? Number.POSITIVE_INFINITY;
  return [...items].sort((a, b) => ord(a) - ord(b) || a.name.localeCompare(b.name));
}

/** All `id="..."` values declared in an SVG fragment. */
export function declaredIds(markup: string | undefined): string[] {
  if (!markup) return [];
  return [...markup.matchAll(/\bid\s*=\s*["']([^"']+)["']/g)].map((m) => m[1] ?? '');
}

/** All `url(#...)` / `href="#..."` references in an SVG fragment. */
export function referencedIds(markup: string): string[] {
  const urls = [...markup.matchAll(/url\(\s*['"]?#([^'")\s]+)['"]?\s*\)/g)].map((m) => m[1] ?? '');
  const hrefs = [...markup.matchAll(/\bhref\s*=\s*["']#([^"']+)["']/g)].map((m) => m[1] ?? '');
  return [...urls, ...hrefs];
}

/** Every defs string a piece of content contributes. */
export function contentDefs(item: HeroDefinition | WallStyle | BoardTheme): string[] {
  if ('portrait' in item) return [item.portrait.defs ?? '', item.figure?.defs ?? ''];
  return [item.defs ?? ''];
}

export interface ValidationResult {
  /** Fatal problems (duplicate content ids). */
  errors: string[];
  /** Non-fatal problems (badly prefixed defs ids, duplicate defs ids). */
  warnings: string[];
}

/** Checks one kind of content (heroes, walls or boards). */
export function validateContent(
  kind: string,
  items: readonly (HeroDefinition | WallStyle | BoardTheme)[],
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) errors.push(`Duplicate ${kind} id "${item.id}"`);
    seen.add(item.id);
    for (const defs of contentDefs(item)) {
      for (const id of declaredIds(defs)) {
        if (!id.startsWith(item.id + '-')) {
          warnings.push(`${kind} "${item.id}": defs id "${id}" should start with "${item.id}-"`);
        }
      }
    }
  }
  return { errors, warnings };
}

function load<T extends HeroDefinition | WallStyle | BoardTheme>(kind: string, modules: Record<string, T>): readonly T[] {
  const items = sortContent(Object.values(modules).filter((m): m is T => !!m && typeof m === 'object'));
  if (import.meta.env.DEV) {
    const { errors, warnings } = validateContent(kind, items);
    if (errors.length) throw new Error(errors.join('\n'));
    for (const w of warnings) console.warn(`[themes] ${w}`);
  }
  if (items.length === 0) throw new Error(`No ${kind} registered`);
  return Object.freeze(items);
}

export const heroes: readonly HeroDefinition[] = load('hero', heroModules);
export const wallStyles: readonly WallStyle[] = load('wall style', wallModules);
export const boardThemes: readonly BoardTheme[] = load('board theme', boardModules);

function finder<T extends Registrable>(list: readonly T[]): (id: string | null | undefined) => T {
  const byId = new Map(list.map((x) => [x.id, x] as const));
  // load() guarantees the list is non-empty.
  return (id) => (id != null ? byId.get(id) : undefined) ?? (list[0] as T);
}

/** Hero by id; unknown ids fall back to the first hero in roster order. */
export const getHero: (id: string | null | undefined) => HeroDefinition = finder(heroes);
/** Wall style by id; unknown ids fall back to the first style. */
export const getWallStyle: (id: string | null | undefined) => WallStyle = finder(wallStyles);
/** Board theme by id; unknown ids fall back to the first theme. */
export const getBoardTheme: (id: string | null | undefined) => BoardTheme = finder(boardThemes);
