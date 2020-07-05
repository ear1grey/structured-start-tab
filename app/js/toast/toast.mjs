export function popup(msg) {
  const div = document.createElement('div');
  div.classList.add('toast');
  div.addEventListener('click', e => e.target.remove());
  div.addEventListener('webkitAnimationEnd', e => e.target.remove());
  div.textContent = msg;
  document.querySelector('#toast').append(div);
}
