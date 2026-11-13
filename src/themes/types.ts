/**
 * Contracts for pluggable content. To add a hero, wall style or board theme,
 * add ONE file in the matching folder (src/themes/heroes, walls, boards) that
 * default-exports an object of the type below. The registry picks it up
 * automatically (import.meta.glob); no other file needs editing.
 *
 * SVG rules for all content:
 * - Markup is an SVG fragment string (no <svg>, <defs>, <script>, <image>, <text>, external URLs).
 * - Gradients/filters go in `defs`; every id MUST be prefixed with "<content id>-"
 *   (e.g. "knight-metal"). Ids starting with "sh-" are shared (see shared-defs.ts).
 */

export interface SvgArt {
  /** Gradient/filter elements (no <defs> wrapper), ids prefixed "<id>-". */
  defs?: string;
  /** Drawing fragment. */
  markup: string;
}

export interface HeroDefinition {
  /** Unique, lowercase kebab-case. Used as id prefix for defs. */
  id: string;
  name: string;
  /** Short role shown under the name, e.g. "Brave Knight". */
  title: string;
  /** Signature colour (hex). Used for the piece base, goal edge and UI accents. */
  color: string;
  /** Sort order in the roster (lower first). */
  order?: number;
  /** Head-and-shoulders portrait in a 0 0 100 100 box (shown in round frames). */
  portrait: SvgArt;
  /**
   * Optional full-body figure in a 0 0 100 130 box. When present it is used on the
   * board and in hero cards. Required class hooks for animation:
   *   .hero-shadow (ground shadow, outside .hero-figure), .hero-figure (everything else),
   *   .hero-eyes (eyes only, blink), .hero-arm (the cheering arm; inline style --pivot: "X% Y%").
   */
  figure?: SvgArt;
}

export interface WallStyle {
  id: string;
  name: string;
  order?: number;
  defs?: string;
  /**
   * Draw a wall lying horizontally in local coordinates: x from 0..length, y from 0..thickness.
   * The renderer rotates it for vertical walls and adds the drop shadow.
   */
  render(length: number, thickness: number): string;
}

export interface BoardDecorationContext {
  /** Full board size in SVG units (square). */
  size: number;
  /** Width of the frame band around the playing area. */
  frame: number;
  /** Deterministic random in [0,1). */
  random: () => number;
}

export interface BoardTheme {
  id: string;
  name: string;
  order?: number;
  defs?: string;
  cellA: string;
  cellB: string;
  /** Darker colour under each cell to give it thickness. */
  cellEdge: string;
  /** Colour of the gaps between cells. */
  groove: string;
  frame: string;
  frameEdge: string;
  /** Optional decorations drawn on the frame band (flowers, snow, stars...). */
  decorate?(ctx: BoardDecorationContext): string;
}
