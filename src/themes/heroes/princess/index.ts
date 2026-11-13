import type { HeroDefinition } from '../../types';
import portrait from './portrait.svg?raw';
import portraitDefs from './portrait.defs.svg?raw';

const hero: HeroDefinition = {
  id: 'princess',
  name: 'Princess Rosa',
  title: 'Royal Princess',
  color: '#ec5a9e',
  order: 2,
  portrait: { defs: portraitDefs, markup: portrait },
};

export default hero;
