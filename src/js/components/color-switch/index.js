import { BetterRange } from '../better-range/index.js';
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
export class ColorSwitch extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    attachStyleSheet(shadow, 'js/components/color-switch/index.css');
    const div = create(shadow, 'div', { id: 'top' });
    // top buttons
    const auto = create(div, 'label', { id: 'auto', for: 'auto' }, this.auto);
    const manual = create(div, 'label', { id: 'manual', for: 'manual' }, this.manual);
    auto.addEventListener('click', () => {
      this.el.auto.setAttribute('class', 'on');
      this.el.manual.removeAttribute('class');
      this.el.main.removeAttribute('class');
      this.open = false;
    });
    manual.addEventListener('click', () => {
      this.el.manual.setAttribute('class', 'on');
      this.el.auto.removeAttribute('class');
      this.el.main.setAttribute('class', 'on');
      this.open = true;
    });
    const main = create(div, 'main', { id: 'main' });
    // color input
    const value = this.value.slice(0, 7);
    const col = create(main, 'label', { id: 'col', for: 'pik' }, chrome.i18n.getMessage('colour'));
    const incol = create(main, 'input', { id: 'pik', type: 'color', value });
    // tranparency input
    const trans = create(main, 'label', { id: 'col', for: 'trs' }, chrome.i18n.getMessage('opacity'));
    const betterRange = create(main, 'better-range', { value: '' });
    incol.addEventListener('input', this.updateValue.bind(this));
    betterRange.addEventListener('input', this.updateValue.bind(this));
    this.el = {
      div,
      auto,
      manual,
      main,
      col,
      incol,
      trans,
      betterRange,
    };
    // decide which one of them is selected
    this.openOrClose();
  }

  get value() {
    return this.getAttribute('value') ?? '';
  }

  set value(val) {
    if (val) {
      this.setAttribute('value', val);
      this.el.incol.value = this.value.slice(0, 7);
      this.el.betterRange.value = this.value.slice(7, 9);
    }
  }

  get auto() {
    return this.getAttribute('auto') ?? undefined;
  }

  set auto(val) {
    if (val) {
      this.setAttribute('auto', val);
    }
  }

  get manual() {
    return this.getAttribute('manual') ?? undefined;
  }

  set manual(val) {
    if (val) {
      this.setAttribute('manual', val);
    }
  }

  get open() {
    return !!this.dataset.open;
  }

  set open(val) {
    if (val) {
      this.dataset.open = 'true';
    } else {
      delete this.dataset.open;
    }
    this.openOrClose();
  }

  updateValue() {
    this.value = this.el.incol.value + this.el.betterRange.value;
    this.open = this.el.manual.classList.contains('on');
  }

  openOrClose() {
    if (this.open) {
      this.el.manual.setAttribute('class', 'on');
      this.el.auto.removeAttribute('class');
      this.el.main.setAttribute('class', 'on');
    } else {
      this.el.manual.removeAttribute('class');
      this.el.auto.setAttribute('class', 'on');
      this.el.main.removeAttribute('class');
    }
  }

  static get observedAttributes() {
    return ['auto', 'manual', 'value', 'open'];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      switch (name) {
        case 'auto':
          this.el.auto.textContent = newValue;
          break;
        case 'manual':
          this.el.manual.textContent = newValue;
          break;
        case 'value':
          this.value = newValue;
          break;
        case 'open':
          this.open = newValue;
          break;
        default:
          break;
      }
    }
  }
}
customElements.define('color-switch', ColorSwitch);
customElements.define('better-range', BetterRange);
