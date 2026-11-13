# Future hero art

Draft full-body figures (viewBox `0 0 100 130`) that are not used by the game yet.
The game currently shows every hero as a round portrait on a base.

To switch a hero to its full figure, copy `figure.svg` and `figure.defs.svg` into
`src/themes/heroes/<id>/` and add them to that hero's `index.ts`:

```ts
import figure from './figure.svg?raw';
import figureDefs from './figure.defs.svg?raw';
// ...
figure: { defs: figureDefs, markup: figure },
```

Art ids must be prefixed with `<id>-` (these drafts use `knight-full-` / `princess-full-`).
