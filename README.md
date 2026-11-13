# Quoridor Clash

A colourful, kid-friendly (8+) wall-and-race board game for the browser. Two or four
players share one device and take turns. Each turn you either move your hero one square
or build a wall to slow everyone else down. The first hero to reach the far side wins.

**Play it:** https://perry513.github.io/quoridor-clash/

> Fan-made game based on the Quoridor rules. Not affiliated with Gigamic.

All characters, artwork and code in this repository are original.

## How to play

1. **Race to the far side.** Reach any square on the opposite edge first. Your goal edge glows in your colour.
2. **One action per turn.** Move one square up, down, left or right, or build one wall.
3. **Walls block the way.** A wall is two squares long and sits in the gaps between squares.
4. **Never trap anyone.** Every hero must always have a path to their goal. The game refuses walls that would seal someone in.
5. **Jump over heroes.** Face to face with another hero? Hop over them. If a wall or the board edge is behind them, step diagonally instead.
6. **Wall supply.** 10 walls each with 2 players, 5 each with 4. When yours run out, you can only move.

**Controls:** click or tap a highlighted square to move. In wall mode, hover to preview a wall
and click to place it (on touch screens, tap once to preview and tap again to place).
Right-click or press **R** to rotate a wall.

**Keyboard:** **M** move, **W** build wall, **R** rotate, **U** or **Ctrl+Z** undo, **Esc** cancel the wall preview.

## Development

Needs Node.js 24 or newer.

```sh
npm install      # install dependencies
npm run dev      # start the dev server (http://localhost:5173/quoridor-clash/)
npm test         # run the unit tests once (Vitest)
npm run build    # type-check and build the static site into dist/
npm run preview  # serve the built site locally
```

Stack: Vite, TypeScript (strict), Vitest. There is no UI framework: the game uses plain
TypeScript, the DOM and inline SVG.

## Project structure

```
src/
  engine/              Game rules in pure TypeScript, no DOM (moves, jumps, walls, path checks)
    types.ts           Engine contracts (board, players, walls, actions)
    board.ts           Sides, start positions, goals, edge/wall blocking
    rules.ts           Valid moves (incl. jumps), wall checks, path finding
    game.ts            createGame, applyAction, turn order
    messages.ts        Kid-friendly messages for rejected actions
    index.ts           Public API (re-exports everything above)
  themes/              All pluggable content: heroes, wall styles, board themes
    types.ts           Content contracts (HeroDefinition, WallStyle, BoardTheme)
    index.ts           Public API (re-exports the registry and renderers)
    registry.ts        Finds everything below automatically (import.meta.glob)
    render.ts          SVG renderers (board, walls, portraits, figures)
    shared-defs.ts     Builds the shared "sh-" defs, incl. the sh-portrait-clip clip path
    shared.defs.svg    Shared gradients and filters (ids start with "sh-")
    svg-utils.ts       Helpers for content files: f1, star, seededRandom, scatterOnFrame, escapeXml
    heroes/<id>/       One folder per hero: index.ts plus SVG art files
    walls/<id>.ts      One file per wall style
    boards/<id>.ts     One file per board theme
  ui/                  Setup screen, game screen, board view, modals, input handling
  styles/              CSS (base, setup, game, modals, hero animations)
  main.ts              Entry point
tests/                 Vitest unit tests (tests/**/*.test.ts)
public/                Static files copied as they are (favicon)
.github/workflows/     GitHub Pages deployment
```

## Adding a hero, wall style or board theme

Content is **registered automatically**. `src/themes/registry.ts` finds every hero, wall style
and board theme with `import.meta.glob`, so to add one you add files in **one folder** and
edit nothing else. The new content appears on the setup screen when the dev server reloads.

When the game loads in dev, the registry checks the content. A duplicate `id` throws an
error. A gradient or filter id without the right prefix logs a warning in the browser console.

### SVG rules (all content)

- Art is an SVG **fragment**: what goes inside an `<svg>`, without the `<svg>` or `<defs>` wrapper.
- Do not use `<script>`, `<image>`, `<text>`, `<foreignObject>` or any external URL.
- Put gradients, filters, patterns and clip paths in the **defs** file or string. The defs
  from all content are combined into one hidden `<svg><defs>` on the page, so every id must be
  unique: **start each id with `<id>-`**, for example `knight-metal` or `knight-full-cape`.
- Ids that start with `sh-` are shared and anyone can use them (see `shared-defs.ts`),
  for example `filter="url(#sh-blur)"`.
- Do not put ids in the drawing itself. A hero is drawn many times on one page.

### Add a hero

Create a folder `src/themes/heroes/<id>/`. The `<id>` is lowercase kebab-case, such as `robot`.

```
src/themes/heroes/robot/
  index.ts            default-exports the HeroDefinition
  portrait.svg        head-and-shoulders portrait, viewBox 0 0 100 100
  portrait.defs.svg   gradients/filters for the portrait (ids start with "robot-")
  figure.svg          optional full-body figure, viewBox 0 0 100 130
  figure.defs.svg     optional defs for the figure (ids start with "robot-")
```

`index.ts`:

```ts
import type { HeroDefinition } from '../../types';
import portrait from './portrait.svg?raw';
import portraitDefs from './portrait.defs.svg?raw';
// Only if you made a full-body figure:
import figure from './figure.svg?raw';
import figureDefs from './figure.defs.svg?raw';

const hero: HeroDefinition = {
  id: 'robot',             // must match the folder name and the defs id prefix
  name: 'Bolt',
  title: 'Clever Robot',   // short role shown under the name
  color: '#4cb6e8',        // signature colour: piece base, goal edge, UI accents
  order: 90,               // position in the roster (lower comes first)
  portrait: { markup: portrait, defs: portraitDefs },
  figure: { markup: figure, defs: figureDefs }, // leave this out if there is no figure
};

export default hero;
```

**Portrait** (`portrait.svg`, 100 x 100 box). It is shown in a round frame. The renderer
clips it to the circle centred at (50, 50) with radius 50 and paints the hero colour behind it.
Keep the face inside that circle and leave the background transparent.

**Figure** (`figure.svg`, 100 x 130 box). It is optional. When present it is used on the board
and in the hero cards. The hero stands on a round base in their colour, with the bottom of the
base near y = 121. These class hooks are required so the figure animates like every other hero:

| Class | Put it on | Used for |
| --- | --- | --- |
| `hero-shadow` | the ground shadow, outside `.hero-figure` | stays on the ground while the hero hops |
| `hero-figure` | a `<g>` around everything else | hop and idle bob |
| `hero-eyes` | a `<g>` around the eyes only | blinking |
| `hero-arm` | a `<g>` around the cheering arm, with `style="--pivot: X% Y%"` at the shoulder | cheer on a win |

A hero without a figure still gets one: the game builds a round portrait token with a white
rim, standing on a base disc in the hero colour. It has the same class hooks, so it animates too.

### Add a wall style

Create `src/themes/walls/<id>.ts`. Helpers such as `f1` (format a number to one decimal)
are in `src/themes/svg-utils.ts`; import them with `import { f1 } from '../svg-utils';`.

```ts
import type { WallStyle } from '../types';

const wall: WallStyle = {
  id: 'candy',
  name: 'Candy',
  order: 50,
  defs: `<linearGradient id="candy-body" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0" stop-color="#ffd1e8"/><stop offset="1" stop-color="#e85a9e"/>
         </linearGradient>`,
  // Draw a horizontal wall: x from 0 to length, y from 0 to thickness.
  // The renderer rotates it for vertical walls and adds the drop shadow.
  render: (length, thickness) =>
    `<rect width="${length}" height="${thickness}" rx="${thickness / 2}" fill="url(#candy-body)"/>`,
};

export default wall;
```

### Add a board theme

Create `src/themes/boards/<id>.ts`. For decorations, `src/themes/svg-utils.ts` has helpers
such as `star`, `f1` and `scatterOnFrame`; import them with `import { star } from '../svg-utils';`.

```ts
import type { BoardTheme } from '../types';

const board: BoardTheme = {
  id: 'desert',
  name: 'Desert',
  order: 50,
  cellA: '#f3d9a4',
  cellB: '#e9c98a',
  cellEdge: '#b8945a',   // darker colour under each cell, gives it thickness
  groove: '#7a5a33',     // the gaps where walls go
  frame: '#a8743f',
  frameEdge: '#6e4a26',
  // Optional decorations on the frame band. Use ctx.random, not Math.random,
  // so the board looks the same every time.
  decorate: ({ size, frame, random }) => {
    let out = '';
    for (let i = 0; i < 12; i++) {
      const x = frame / 2 + random() * (size - frame);
      out += `<circle cx="${x.toFixed(1)}" cy="${(frame / 2).toFixed(1)}" r="3" fill="#ffe9b0"/>`;
    }
    return out;
  },
};

export default board;
```

The board is 712 units square: a 30-unit frame around 9 x 9 cells of 60 units, with 14-unit
gaps between them (`BOARD_GEOMETRY` in `src/themes/index.ts`).

## Deploying to GitHub Pages

The workflow in `.github/workflows/deploy.yml` runs on every push to `main`. You can also start
it by hand from the Actions tab. It installs dependencies, runs the tests, builds the site and
publishes `dist/` to GitHub Pages.

One-time setup: in the GitHub repository, open **Settings -> Pages** and set **Source** to
**GitHub Actions**.

The site is served from `/quoridor-clash/`, which is set as `base` in `vite.config.ts`.
If you rename the repository, change `base` to match.
