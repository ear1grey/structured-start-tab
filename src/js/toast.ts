import { OPTS } from './defaults.js';

function isDupe(msg: string) {
  const slices = document.querySelectorAll('#toast>.toast') as NodeListOf<HTMLElement>;
  for (const slice of slices) {
    if (slice.dataset.name === msg || slice.textContent === msg) return true;
  }
  return false;
}

export function html(name = 'dupe', html: string) :void {
  if (OPTS.showToast > 0 && !isDupe(name)) {
    const parser = new DOMParser();
    const tdoc = parser.parseFromString(html, 'text/html');
    const div = document.createElement('div');
    div.dataset.name = name;
    div.classList.add('toast');
    div.addEventListener('click', e => (e.target as Element).remove());
    div.addEventListener('webkitAnimationEnd', e => (e.target as Element).remove());
    [...tdoc.body.children].forEach(x => div.append(x));
    const toast = document.querySelector('#toast');
    if (toast) {
      toast.append(div);
    }
  }
}

export function popup(msg: string) :void {
  if (OPTS.showToast > 0 && !isDupe(msg)) {
    setToastTime(OPTS.showToast);
    const div = document.createElement('div');
    div.classList.add('toast');
    div.addEventListener('click', e => (e.target as Element).remove());
    div.addEventListener('webkitAnimationEnd', e => (e.target as Element).remove());
    div.textContent = msg;
    document.querySelector('#toast')?.append(div);
  }
}

function setToastTime(num: number) {
  document.documentElement.style.setProperty('--toast-time', num + 's');
}

export function prepare() :void {
  const div = document.createElement('div');
  div.id = 'toast';
  document.body.append(div);
  setToastTime(OPTS.showToast);
}
