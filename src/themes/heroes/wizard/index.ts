import type { HeroDefinition } from '../../types';
import portrait from './portrait.svg?raw';
import portraitDefs from './portrait.defs.svg?raw';

const hero: HeroDefinition = {
  id: 'wizard',
  name: 'Merlo',
  title: 'Star Wizard',
  color: '#8b5cf6',
  order: 3,
  portrait: { defs: portraitDefs, markup: portrait },
};

export default hero;
