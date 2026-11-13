import type { BoardTheme } from '../types';
import { scatterOnFrame, star } from '../svg-utils';

const starlight: BoardTheme = {
  id: 'starlight',
  name: 'Starlight',
  order: 4,
  cellA: '#4a4697',
  cellB: '#423e8b',
  cellEdge: '#2c2970',
  groove: '#1c1a4c',
  frame: '#15133d',
  frameEdge: '#3c3890',
  // Gold and white stars.
  decorate: (ctx) => scatterOnFrame(ctx, 34, (x, y, k) => star(x, y, 1.8 + k * 2.4, k > 0.6 ? '#ffd23f' : '#ffffff')),
};

export default starlight;
