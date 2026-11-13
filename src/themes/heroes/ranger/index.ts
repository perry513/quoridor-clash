import type { HeroDefinition } from '../../types';
import portrait from './portrait.svg?raw';
import portraitDefs from './portrait.defs.svg?raw';

const hero: HeroDefinition = {
  id: 'ranger',
  name: 'Wren',
  title: 'Forest Ranger',
  color: '#13a3a3',
  order: 5,
  portrait: { defs: portraitDefs, markup: portrait },
};

export default hero;
