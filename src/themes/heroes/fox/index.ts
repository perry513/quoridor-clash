import type { HeroDefinition } from '../../types';
import portrait from './portrait.svg?raw';
import portraitDefs from './portrait.defs.svg?raw';

const hero: HeroDefinition = {
  id: 'fox',
  name: 'Fennel',
  title: 'Clever Fox',
  color: '#f2711c',
  order: 7,
  portrait: { defs: portraitDefs, markup: portrait },
};

export default hero;
