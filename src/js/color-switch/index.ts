
function attachStyleSheet(shadow:ShadowRoot) {
  const e = document.createElement('link');
  e.setAttribute('rel', 'stylesheet');
  e.setAttribute('type', 'text/css');
  e.setAttribute('href', 'js/color-switch/index.css');
  shadow.append(e);
}

interface ElAttrs {
  [key:string]:string
}

function create(where:HTMLElement|DocumentFragment, what:"input", attrs:ElAttrs, text?:string) :HTMLInputElement;
function create(where:HTMLElement|DocumentFragment, what:string, attrs:ElAttrs, text?:string) :HTMLElement;

function create(where:HTMLElement|DocumentFragment, what:string, attrs:ElAttrs = {}, text?:string) {
  const x = document.createElement(what);
  where.append(x);
  for (const key of Object.keys(attrs)) {
    x.setAttribute(key, attrs[key]);
  }

  if (text) x.textContent=text;
  return x;
}

interface Elements {
  incol:HTMLInputElement,
  intrans:HTMLInputElement,
  [key:string]:HTMLElement
}

export class ColorSwitch extends HTMLElement {

  get open() { return this.hasAttribute('open'); };
  get value() { return this.getAttribute('value') ?? ""; }
  get auto() { return this.getAttribute('auto')?? undefined; }
  get manual() { return this.getAttribute('manual') ?? undefined; }

  set open(val:boolean) {
    if (val) {
      this.dataset.open = "true";
    } else {
      delete this.dataset.open;
    }
    this.openOrClose();
  }

  set value(val) {
    if (val) {
      this.setAttribute('value', val);
      this.el.incol.value = this.value.slice(0,7);
      this.el.intrans.value = String(parseInt(this.value.slice(7,9), 16));
    }
  }

  set auto(val) { if (val) { this.setAttribute('auto', val); } }
  set manual(val) { if (val) { this.setAttribute('manual', val); } }


  updateValue() {
    this.value = this.el.incol.value + ("0"+Number(this.el.intrans.value).toString(16)).slice(-2);
    this.open = this.el.manual.classList.contains('on');
  }

  openOrClose() {
    if (this.open) {
      this.el.manual.setAttribute('class', 'on');
      this.el.auto.removeAttribute('class');
      this.el.main.setAttribute('class', 'on');
    } else {
      this.el.manual.removeAttribute("class");
      this.el.auto.setAttribute('class', 'on');
      this.el.main.removeAttribute('class');
    }
  }

  el:Elements;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    attachStyleSheet(shadow);

    const div = create(shadow, 'div', {id: 'top'});

    // top buttons
    const auto = create(div, 'label', {id: 'auto', for: 'auto'}, this.auto);
    const manual = create(div, 'label', {id: 'manual', for: 'manual'}, this.manual);
    auto.addEventListener('click', () => {
      this.el.auto.setAttribute('class', 'on');
      this.el.manual.removeAttribute('class');
      this.el.main.removeAttribute('class');
      this.open = false;
    })
    manual.addEventListener('click', () => {
      this.el.manual.setAttribute('class', 'on');
      this.el.auto.removeAttribute('class');
      this.el.main.setAttribute('class', 'on');
      this.open = true;
    })

    const main = create(div, 'main', {id: 'main'});

    // decide which one of them is selected
    this.openOrClose();

    // color input
    const value = this.value.slice(0,7);
    const col = create(main, 'label', {id: 'col', for: 'pik'}, 'Colour');
    const incol = create(main, 'input', {id: 'pik', type: 'color', value});

    // tranparency input
    const transValue = String(parseInt(this.value.slice(7,9), 16));
    const trans = create(main, 'label', {id: 'col', for: 'trs'}, 'Tranparency');
    const intrans = create(main, 'input', { id: 'trs', type: 'range', min:"0", max:"255", value: transValue });

    incol.addEventListener('input', this.updateValue.bind(this));
    intrans.addEventListener('input', this.updateValue.bind(this));

    this.el = {
      div,
      auto,
      manual,
      main,
      col,
      incol,
      trans,
      intrans
    };

  }
}

customElements.define('color-switch', ColorSwitch);
