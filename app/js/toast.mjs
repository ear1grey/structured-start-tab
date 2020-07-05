import { OPTS } from "./defaults.mjs";

export function popup(msg) {
  if (OPTS.showToast > 0) {
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
