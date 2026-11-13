import type { WallStyle } from '../types';
import { f1 } from '../svg-utils';

const hedge: WallStyle = {
  id: 'hedge',
  name: 'Hedge',
  order: 1,
  render(L, T) {
    let s = `<rect width="${L}" height="${T}" rx="${T / 2}" fill="#2b7a37"/>`;
    let i = 0;
    for (let x = T / 2; x <= L - T / 2 + 0.1; x += 8, i++) {
      s += `<circle cx="${f1(x)}" cy="${f1(T * 0.42)}" r="${f1(T * 0.4)}" fill="#3c9a48"/>`;
      s += `<circle cx="${f1(x - 1.6)}" cy="${f1(T * 0.3)}" r="${f1(T * 0.14)}" fill="#76cf6e" opacity=".85"/>`;
      if (i % 4 === 2) {
        s += `<circle cx="${f1(x + 2)}" cy="${f1(T * 0.62)}" r="2" fill="#ffd6e8"/><circle cx="${f1(x + 2)}" cy="${f1(T * 0.62)}" r=".9" fill="#ffc53d"/>`;
      }
    }
    return s;
  },
};

export default hedge;
