import type { HeroDefinition } from '../../types';
import portrait from './portrait.svg?raw';
import portraitDefs from './portrait.defs.svg?raw';

const hero: HeroDefinition = {
  id: 'dragon',
  name: 'Ember',
  title: 'Little Dragon',
  color: '#22b36d',
  order: 4,
  portrait: { defs: portraitDefs, markup: portrait },
};

export default hero;
