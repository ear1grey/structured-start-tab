import { Options } from './defaults.js';

let tip: HTMLElement;
let OPTS: Options;

const gap = 40;

export function reposition(e: MouseEvent, messageOverride?: string) {
  if (!OPTS.showToolTips) return;

  tip.textContent = messageOverride ?? (e.target as HTMLElement).dataset.info ?? "";
  tip.style.setProperty('visibility', 'inherit');

  let x = e.clientX;
  let y = e.clientY;

  if (2 * e.clientX > document.documentElement.clientWidth) {
    x = x - tip.clientWidth - gap;
  } else {
    x = x + gap;
  }
  y = y - tip.clientHeight - gap;

  document.documentElement.style.setProperty('--tool-tip-left', `${x}px`);
  document.documentElement.style.setProperty('--tool-tip-top', `${y}px`);
}

export function hide() {
  tip.style.setProperty('visibility', 'hidden');
}

export function prepare(O: Options, selector = '[data-info]') {
  OPTS = O;
  const things = document.querySelectorAll(selector) as NodeListOf<HTMLElement>;

  for (const thing of things) {
    thing.addEventListener('mousemove', reposition);
    thing.addEventListener('mouseout', hide);
  }

  tip = document.createElement('p');
  tip.id = 'tinytooltip';
  document.body.append(tip);
  hide();
}
