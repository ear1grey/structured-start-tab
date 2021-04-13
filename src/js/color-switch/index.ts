
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

function create(where:HTMLElement|DocumentFragment, what:'input', attrs:ElAttrs, text?:string) :HTMLInputElement;
function create(where:HTMLElement|DocumentFragment, what:string, attrs:ElAttrs, text?:string) :HTMLElement;

function create(where:HTMLElement|DocumentFragment, what:string, attrs:ElAttrs = {}, text?:string) {
  const x = document.createElement(what);
  where.append(x);
  for (const key of Object.keys(attrs)) {
    x.setAttribute(key, attrs[key]);
  }

  if (text) x.textContent = text;
  return x;
}

interface Elements {
  incol:HTMLInputElement,
  intrans:HTMLInputElement,
  intransnum:HTMLInputElement,
  [key:string]:HTMLElement
}

type OptionalString = string|undefined;

export class ColorSwitch extends HTMLElement {
  get value() :string {
    return this.getAttribute('value') ?? '';
  }

  set value(val:string) {
    if (val) {
      this.setAttribute('value', val);
      this.el.incol.value = this.value.slice(0, 7);
      this.el.intrans.value = String(parseInt(this.value.slice(7, 9), 16));
      this.el.intransnum.value = String(parseInt(this.value.slice(7, 9), 16));
    }
  }

  get auto() :OptionalString {
    return this.getAttribute('auto') ?? undefined;
  }

  set auto(val:OptionalString) {
    if (val) { this.setAttribute('auto', val); }
  }

  get manual() :OptionalString {
    return this.getAttribute('manual') ?? undefined;
  }

  set manual(val:OptionalString) {
    if (val) { this.setAttribute('manual', val); }
  }

  get open() :boolean {
    return !!this.dataset.open;
  }

  set open(val:boolean) {
    if (val) {
      this.dataset.open = 'true';
    } else {
      delete this.dataset.open;
    }
    this.openOrClose();
  }


  updateValue(e :Event) :void {
    const target = e.target as HTMLElement;
    if (target.id === 'trsnum') {
      this.value = this.el.incol.value + ('0' + Number(this.el.intransnum.value).toString(16)).slice(-2);
    } else {
      this.value = this.el.incol.value + ('0' + Number(this.el.intrans.value).toString(16)).slice(-2);
    }
    this.open = this.el.manual.classList.contains('on');
  }

  openOrClose() :void {
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

  el:Elements;

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    attachStyleSheet(shadow);

    const div = create(shadow, 'div', { id: 'top' });

    // top buttons
    const auto = create(div, 'label', { id: 'auto', for: 'auto' }, this.auto);
    const manual = create(div, 'label', { id: 'manual', for: 'manual' }, this.manual);
    auto.addEventListener('click', () => {
      console.log('Automatic clicked');

      this.el.auto.setAttribute('class', 'on');
      this.el.manual.removeAttribute('class');
      this.el.main.removeAttribute('class');
      this.open = false;
    });
    manual.addEventListener('click', () => {
      console.log('Manual clicked');
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
    const transValue = String(parseInt(this.value.slice(7, 9), 16));
    const trans = create(main, 'label', { id: 'col', for: 'trs' }, chrome.i18n.getMessage('tranparency'));
    const intrans = create(main, 'input', { id: 'trs', type: 'range', min: '0', max: '255', value: transValue });
    const labelnum = create(main, 'label', { id: 'col', for: 'trsnum' }, '%');
    const intransnum = create(main, 'input', { id: 'trsnum', type: 'number', min: '0', max: '255', value: transValue });

    incol.addEventListener('input', this.updateValue.bind(this));
    intrans.addEventListener('input', this.updateValue.bind(this));
    intransnum.addEventListener('input', this.updateValue.bind(this));

    this.el = {
      div,
      auto,
      manual,
      main,
      col,
      incol,
      trans,
      intrans,
      labelnum,
      intransnum,
    };

    // decide which one of them is selected
    this.openOrClose();
  }
}

customElements.define('color-switch', ColorSwitch);
