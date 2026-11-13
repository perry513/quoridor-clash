/** Modal helpers: open/close with focus handling, plus the win confetti. */

const lastFocus = new WeakMap<HTMLElement, Element | null>();

export function isOpen(modal: HTMLElement): boolean {
  return !modal.hidden;
}

export function openModal(modal: HTMLElement, focus?: HTMLElement | null): void {
  if (modal.hidden) lastFocus.set(modal, document.activeElement);
  modal.hidden = false;
  const target = focus ?? modal.querySelector<HTMLElement>('.btn.gold') ?? modal.querySelector<HTMLElement>('button');
  target?.focus({ preventScroll: true });
}

export function closeModal(modal: HTMLElement): void {
  if (modal.hidden) return;
  modal.hidden = true;
  const prev = lastFocus.get(modal);
  lastFocus.delete(modal);
  if (prev instanceof HTMLElement && prev.isConnected && !prev.closest('[hidden]')) prev.focus({ preventScroll: true });
}

/** Wire a modal so clicking its dim backdrop closes it. */
export function closeOnBackdrop(modal: HTMLElement, onClose: () => void = () => closeModal(modal)): void {
  modal.addEventListener('click', (e) => {
    if (e.target === modal) onClose();
  });
}

/** Falling confetti pieces in the given colours. */
export function confettiMarkup(colors: readonly string[], count = 56): string {
  const palette = colors.length ? colors : ['#ffc53d', '#ffffff'];
  return Array.from({ length: count }, (_, i) => {
    const c = palette[i % palette.length] ?? '#ffc53d';
    const style = [
      `--x:${(i * 37) % 100}%`,
      `--c:${c}`,
      `--d:${(2.2 + (i % 7) * 0.35).toFixed(2)}s`,
      `--delay:${(-(i % 11) * 0.3).toFixed(1)}s`,
      `--r:${(i % 2 ? 1 : -1) * (300 + i * 9)}deg`,
    ].join(';');
    return `<i style="${style}"></i>`;
  }).join('');
}
