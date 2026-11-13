import type { WallStyle } from '../types';
import { f1, star } from '../svg-utils';

const crystal: WallStyle = {
  id: 'crystal',
  name: 'Crystal',
  order: 4,
  defs: `<linearGradient id="crystal-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8eefff" stop-opacity=".95"/><stop offset="1" stop-color="#ad8dff" stop-opacity=".92"/></linearGradient>`,
  render(L, T) {
    let s = `<rect width="${L}" height="${T}" rx="4" fill="url(#crystal-glass)" stroke="#e9fbff" stroke-width="1.5"/>`;
    for (let x = 4; x < L - 6; x += 16) {
      s += `<path d="M${x} ${T - 1} L${x + 8} 1" stroke="#ffffff" stroke-opacity=".5" stroke-width="1.3"/>`;
    }
    s += `<path d="M5 3.2 H${f1(L * 0.45)}" stroke="#ffffff" stroke-opacity=".9" stroke-width="1.8" stroke-linecap="round"/>`;
    s += star(L * 0.72, T / 2, 3.2, '#ffffff');
    return s;
  },
};

export default crystal;
