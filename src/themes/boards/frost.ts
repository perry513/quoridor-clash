import type { BoardTheme } from '../types';
import { f1, scatterOnFrame } from '../svg-utils';

const frost: BoardTheme = {
  id: 'frost',
  name: 'Frost',
  order: 3,
  cellA: '#f1f8fd',
  cellB: '#e0f0fb',
  cellEdge: '#b7d6ec',
  groove: '#87b2d2',
  frame: '#3f6a8f',
  frameEdge: '#284862',
  // Snowflakes of varying size and opacity.
  decorate: (ctx) =>
    scatterOnFrame(
      ctx,
      34,
      (x, y, k) => `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1 + k * 1.6)}" fill="#ffffff" opacity="${(0.5 + k * 0.45).toFixed(2)}"/>`,
    ),
};

export default frost;
