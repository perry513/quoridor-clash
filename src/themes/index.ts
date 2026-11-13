/**
 * Public API of the themes module (heroes, wall styles, board themes and their renderers).
 *
 * Adding content = adding files in ONE folder, nothing else:
 *   - hero:        src/themes/heroes/<id>/index.ts (+ portrait.svg, portrait.defs.svg,
 *                  optional figure.svg, figure.defs.svg imported with "?raw")
 *   - wall style:  src/themes/walls/<id>.ts
 *   - board theme: src/themes/boards/<id>.ts
 */
export type { BoardDecorationContext, BoardTheme, HeroDefinition, SvgArt, WallStyle } from './types';
export {
  heroes,
  wallStyles,
  boardThemes,
  getHero,
  getWallStyle,
  getBoardTheme,
  validateContent,
  declaredIds,
  referencedIds,
} from './registry';
export {
  BOARD_GEOMETRY,
  MINI_GEOMETRY,
  allDefsMarkup,
  boardBackgroundSvg,
  boardPixelSize,
  cellCenter,
  cellPosition,
  heroFigureSvg,
  miniBoardSvg,
  portraitMarkup,
  portraitSvg,
  wallSize,
  wallSvg,
} from './render';
export type { BoardBackgroundOptions, BoardGeometry, Point, WallSvgOptions } from './render';
export { PORTRAIT_CLIP_ID, SHARED_DEFS } from './shared-defs';
export { star, seededRandom } from './svg-utils';
