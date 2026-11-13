import type { WallStyle } from '../types';

const wood: WallStyle = {
  id: 'wood',
  name: 'Fence',
  order: 3,
  render(L, T) {
    let s = `<rect width="${L}" height="${T}" rx="2.5" fill="#cf9157" stroke="#6e4220" stroke-width="1.5"/>`;
    for (let x = 9; x < L - 4; x += 9) s += `<path d="M${x} 1.5 V${T - 1.5}" stroke="#9a6331" stroke-width="1.2"/>`;
    s += `<path d="M2 2.5 H${L - 2}" stroke="#ecbb87" stroke-width="1.3" stroke-linecap="round"/>`;
    for (const px of [-1, L / 2 - 3.5, L - 6]) {
      s += `<rect x="${px}" y="-2" width="7" height="${T + 4}" rx="2" fill="#8a5428" stroke="#5a3415" stroke-width="1.2"/>`;
    }
    return s;
  },
};

export default wood;
