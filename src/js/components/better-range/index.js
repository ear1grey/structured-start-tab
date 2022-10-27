import { attachStyleSheet } from '../comp-utils.js';
function create(where, what, attrs = {}, text) {
  const x = document.createElement(what);
  where.append(x);
  for (const key of Object.keys(attrs)) {
    x.setAttribute(key, attrs[key]);
  }
  if (text) { x.textContent = text; }
  return x;
}
export class BetterRange extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    attachStyleSheet(shadow, 'js/components/better-range/index.css');
    const div = create(shadow, 'div', { id: 'better_range' });
    // tranparency input
    const transValue = String(parseInt(this.value.slice(7, 9), 16));
    const intrans = create(div, 'input', { id: 'trs', type: 'range', min: '0', max: '255', value: transValue });
    const intransnum = create(div, 'input', { id: 'trsnum', type: 'number', min: '0', max: '100', value: transValue });
    const labelnum = create(div, 'label', { id: 'col', for: 'trsnum' }, '%');
    intrans.addEventListener('input', this.updateValue.bind(this));
    intransnum.addEventListener('input', this.updateValue.bind(this));
    this.el = {
      intrans,
      labelnum,
      intransnum,
    };
  }

  get value() {
    return this.getAttribute('value') ?? '';
  }

  set value(val) {
    this.setAttribute('value', val);
    this.el.intrans.value = String(parseInt(this.value, 16));
    this.el.intransnum.value = String(Math.round(parseInt(this.value, 16) * 100 / 255));
  }

  updateValue(e) {
    const target = e.target;
    if (target.id === 'trsnum') {
      this.value = ('0' + Math.round(Number(this.el.intransnum.value) * 255 / 100).toString(16)).slice(-2);
    } else {
      this.value = ('0' + Number(this.el.intrans.value).toString(16)).slice(-2);
    }
  }
}
