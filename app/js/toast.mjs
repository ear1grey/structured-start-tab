import { OPTS } from './defaults.mjs';

function isDupe(msg) {
  const slices = document.querySelectorAll('#toast>.toast');
  for (const slice of slices) {
    if (slice.name == msg || slice.textContent === msg) return true;
  }
  return false;
}

export function html(name='dupe', html) {
  if (OPTS.showToast > 0 && !isDupe(name)) {
    const parser = new DOMParser();
    const tdoc = parser.parseFromString(html, 'text/html');
    const div = document.createElement('div');
    div.name = name;
    div.classList.add('toast');
    div.addEventListener('click', e => e.target.remove());
    div.addEventListener('webkitAnimationEnd', e => e.target.remove());
    [...tdoc.body.children].forEach(x => div.append(x));
    document.querySelector('#toast').append(div);
  }
}

export function popup(msg) {
  if (OPTS.showToast > 0 && !isDupe(msg)) {
    setToastTime(OPTS.showToast);
    const div = document.createElement('div');
    div.classList.add('toast');
    div.addEventListener('click', e => e.target.remove());
    div.addEventListener('webkitAnimationEnd', e => e.target.remove());
    div.textContent = msg;
    document.querySelector('#toast').append(div);
  }
}

function setToastTime(num) {
  document.documentElement.style.setProperty('--toast-time', num + 's');
}

export function prepare() {
  const div = document.createElement('div');
  div.id = 'toast';
  document.body.append(div);
  setToastTime(OPTS.showToast);
}
