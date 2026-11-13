import type { WallStyle } from '../types';

const stone: WallStyle = {
  id: 'stone',
  name: 'Stone',
  order: 2,
  render(L, T) {
    let s = `<rect width="${L}" height="${T}" rx="3" fill="#a3a9b6" stroke="#5d6372" stroke-width="1.5"/>`;
    s += `<path d="M1 ${T / 2} H${L - 1}" stroke="#6f7585" stroke-width="1.2"/>`;
    for (let x = 12; x < L - 2; x += 14) s += `<path d="M${x} 1 V${T / 2}" stroke="#6f7585" stroke-width="1.2"/>`;
    for (let x = 5; x < L - 2; x += 14) s += `<path d="M${x} ${T / 2} V${T - 1}" stroke="#6f7585" stroke-width="1.2"/>`;
    s += `<path d="M3 2.4 H${L - 3}" stroke="#dde1e8" stroke-width="1.4" stroke-linecap="round"/>`;
    return s;
  },
};

export default stone;
