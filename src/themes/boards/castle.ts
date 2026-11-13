import type { BoardTheme } from '../types';
import { f1, scatterOnFrame } from '../svg-utils';

const castle: BoardTheme = {
  id: 'castle',
  name: 'Castle',
  order: 2,
  cellA: '#ddd4c5',
  cellB: '#d0c6b4',
  cellEdge: '#ada18b',
  groove: '#7d7160',
  frame: '#5f5550',
  frameEdge: '#38302d',
  // Rivets on every other scattered point.
  decorate: (ctx) =>
    scatterOnFrame(ctx, 34, (x, y, _k, i) =>
      i % 2 === 0 ? `<circle cx="${f1(x)}" cy="${f1(y)}" r="2.3" fill="#7a6f69" stroke="#2e2826" stroke-width="1"/>` : '',
    ),
};

export default castle;
