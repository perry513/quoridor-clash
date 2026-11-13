import type { HeroDefinition } from '../../types';
import portrait from './portrait.svg?raw';
import portraitDefs from './portrait.defs.svg?raw';

const hero: HeroDefinition = {
  id: 'pirate',
  name: 'Captain Coral',
  title: 'Sky Pirate',
  color: '#e5484d',
  order: 6,
  portrait: { defs: portraitDefs, markup: portrait },
};

export default hero;
