/**
 * Shared SVG definitions used by all content. Ids start with "sh-" so they can
 * never clash with content defs (which are prefixed "<content id>-").
 *
 * shared.defs.svg holds the gradients/filters the hero artists draw with
 * (sh-skin, sh-eye, sh-blush, sh-gloss, sh-ao, sh-bd-light, sh-bd-dark,
 * sh-blur, sh-blur-lg); it is re-synced from the art folder by copying.
 */
import artistDefs from './shared.defs.svg?raw';

/** Circle clip for portraits (0 0 100 100 box). */
export const PORTRAIT_CLIP_ID = 'sh-portrait-clip';

const extraDefs = [
  `<clipPath id="${PORTRAIT_CLIP_ID}" clipPathUnits="userSpaceOnUse"><circle cx="50" cy="50" r="50"/></clipPath>`,
  // Used by the fallback figure's base disc (overlays on top of the hero colour).
  `<linearGradient id="sh-base-shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000000" stop-opacity=".05"/><stop offset=".55" stop-color="#000000" stop-opacity=".22"/><stop offset="1" stop-color="#000000" stop-opacity=".45"/></linearGradient>`,
  `<radialGradient id="sh-base-top" cx=".35" cy=".25" r=".8"><stop offset="0" stop-color="#ffffff" stop-opacity=".55"/><stop offset=".6" stop-color="#ffffff" stop-opacity=".08"/><stop offset="1" stop-color="#000000" stop-opacity=".12"/></radialGradient>`,
].join('\n');

export const SHARED_DEFS: string = extraDefs + '\n' + artistDefs.trim();
