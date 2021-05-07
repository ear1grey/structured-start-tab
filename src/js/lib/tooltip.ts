import * as types from './types.js';

let tip: HTMLElement;
let OPTS: types.Options;

const gap = 20;

export function reposition(e: MouseEvent, messageOverride?: string) :void {
  if (!OPTS.showToolTips) return;

  tip.textContent = messageOverride ?? (e.target as HTMLElement).dataset.info ?? '';
  tip.style.setProperty('visibility', 'inherit');

  let x = e.clientX;
  let y = e.clientY;

  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  if (x >= centerX) {
    x = x - tip.clientWidth - gap;
  } else {
    x = x + gap;
  }

  if (y >= centerY) {
    y = y - tip.clientHeight - gap;
  } else {
    y = y + gap;
  }

  document.documentElement.style.setProperty('--tool-tip-left', `${x}px`);
  document.documentElement.style.setProperty('--tool-tip-top', `${y}px`);
}

export function hide() :void {
  tip.style.setProperty('visibility', 'hidden');
}

export function prepare(O: types.Options, selector = '[data-info]') :void {
  OPTS = O;
  const things = document.querySelectorAll<HTMLElement>(selector);

  for (const thing of things) {
    thing.addEventListener('mousemove', reposition);
    thing.addEventListener('mouseout', hide);
  }

  tip = document.createElement('p');
  tip.id = 'tinytooltip';
  document.body.append(tip);
  hide();
}
