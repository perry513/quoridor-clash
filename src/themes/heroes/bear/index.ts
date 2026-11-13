import type { HeroDefinition } from '../../types';
import portrait from './portrait.svg?raw';
import portraitDefs from './portrait.defs.svg?raw';

const hero: HeroDefinition = {
  id: 'bear',
  name: 'Bruno',
  title: 'Royal Guard',
  color: '#d39b14',
  order: 8,
  portrait: { defs: portraitDefs, markup: portrait },
};

export default hero;
