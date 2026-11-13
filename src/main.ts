/**
 * Entry point: injects the shared SVG defs once, then wires the setup screen,
 * the game screen and the How-to-play modal together.
 */
import './styles/base.css';
import './styles/setup.css';
import './styles/game.css';
import './styles/modals.css';
import './styles/heroes.css';

import { allDefsMarkup } from './themes';
import { $, $$ } from './ui/dom';
import { createGameScreen } from './ui/game-screen';
import { closeModal, closeOnBackdrop, isOpen, openModal } from './ui/modals';
import { loadSettings } from './ui/settings';
import { createSetupScreen } from './ui/setup-screen';
import { createToast } from './ui/toast';

// One hidden <svg><defs> for every gradient/filter used by heroes, walls and boards.
document.body.insertAdjacentHTML(
  'afterbegin',
  `<svg class="defs" aria-hidden="true" focusable="false"><defs>${allDefsMarkup()}</defs></svg>`,
);

const settings = loadSettings();
const setupEl = $('#setup');
const gameEl = $('#game');
const rulesModal = $('#rulesModal');

type Screen = 'setup' | 'game';
function showScreen(which: Screen): void {
  setupEl.hidden = which !== 'setup';
  gameEl.hidden = which !== 'game';
  window.scrollTo(0, 0);
}

const game = createGameScreen({
  toast: createToast($('#toast')),
  onChangeHeroes: () => {
    setup.render();
    showScreen('setup');
  },
});

const setup = createSetupScreen(settings, () => {
  game.newGame(settings);
  showScreen('game');
});

for (const b of $$('[data-open-rules]')) b.addEventListener('click', () => openModal(rulesModal));
for (const b of $$('[data-close-rules]')) b.addEventListener('click', () => closeModal(rulesModal));
closeOnBackdrop(rulesModal);

document.addEventListener('keydown', (e) => {
  if (isOpen(rulesModal)) {
    if (e.key === 'Escape') closeModal(rulesModal);
    return;
  }
  const target = e.target as HTMLElement | null;
  if (gameEl.hidden || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA') return;
  game.handleKey(e);
});

setup.render();
showScreen('setup');
