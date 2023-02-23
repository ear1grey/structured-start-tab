export function wiggleElement(el) {
  el.classList.add('wiggle');
  setTimeout(() => el.classList.remove('wiggle'), 500);
}

function toHex(x, scale = 1) {
  // We need to scale the value to 0-255
  x = Math.round(x * scale);
  if (isNaN(x)) { return '00'; }
  return x.toString(16).padStart(2, '0');
}

function translateColor(rgba) {
  const parts = rgba.split('(')[1].split(')')[0].split(',');
  const converted = [
    toHex(Number(parts[0])),
    toHex(Number(parts[1])),
    toHex(Number(parts[2])),
    toHex(Number(parts[3] || '255'), 255),
  ];
  let result = '#' + converted.join('');
  if (result.includes('#ffffff')) result = '!' + result;

  return result;
}

export function getColours(el) {
  const style = window.getComputedStyle(el);
  return {
    backgroundColour: el.backgroundColour
      ? el.backgroundColour
      : el.dataset.bg ? el.dataset.bg : translateColor(style.backgroundColor),
    foregroundColour: el.textColour
      ? el.textColour
      : el.dataset.fg ? el.dataset.fg : translateColor(style.color),
    borderColour: el.borderColour,
  };
}

export function flash(elem, cls = 'flash') {
  elem.classList.add(cls);
  elem.addEventListener('animationend', () => { elem.classList.remove(cls); });
}
