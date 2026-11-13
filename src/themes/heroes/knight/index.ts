import type { HeroDefinition } from '../../types';
import portrait from './portrait.svg?raw';
import portraitDefs from './portrait.defs.svg?raw';

const hero: HeroDefinition = {
  id: 'knight',
  name: 'Sir Pip',
  title: 'Brave Knight',
  color: '#3d7bfd',
  order: 1,
  portrait: { defs: portraitDefs, markup: portrait },
};

export default hero;
