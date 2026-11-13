import type { BoardTheme } from '../types';
import { f1, scatterOnFrame } from '../svg-utils';

const FLOWER_COLOURS = ['#ffd6e8', '#ffffff', '#ffe08a'];

const meadow: BoardTheme = {
  id: 'meadow',
  name: 'Meadow',
  order: 1,
  cellA: '#a8dd80',
  cellB: '#9ad373',
  cellEdge: '#77b552',
  groove: '#55893c',
  frame: '#8a5a34',
  frameEdge: '#5a3818',
  decorate: (ctx) =>
    scatterOnFrame(ctx, 34, (x, y, _k, i) => {
      const c = FLOWER_COLOURS[i % FLOWER_COLOURS.length];
      return (
        `<g transform="translate(${f1(x)},${f1(y)})">` +
        `<circle cx="0" cy="-2.2" r="1.9" fill="${c}"/><circle cx="2.2" cy="0" r="1.9" fill="${c}"/>` +
        `<circle cx="0" cy="2.2" r="1.9" fill="${c}"/><circle cx="-2.2" cy="0" r="1.9" fill="${c}"/>` +
        `<circle r="1.3" fill="#e7a314"/></g>`
      );
    }),
};

export default meadow;
