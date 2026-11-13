/** Short status message shown over the board. */
export interface Toast {
  show(message: string, bad?: boolean): void;
  hide(): void;
}

export function createToast(el: HTMLElement, durationMs = 2400): Toast {
  let timer: number | undefined;
  const hide = (): void => {
    el.classList.remove('show');
  };
  return {
    show(message, bad = false) {
      el.textContent = message;
      el.classList.toggle('bad', bad);
      el.classList.add('show');
      window.clearTimeout(timer);
      timer = window.setTimeout(hide, durationMs);
    },
    hide() {
      window.clearTimeout(timer);
      hide();
    },
  };
}
