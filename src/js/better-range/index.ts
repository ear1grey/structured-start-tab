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
  intrans:HTMLInputElement,
  intransnum:HTMLInputElement,
  [key:string]:HTMLElement
}

export class BetterRange extends HTMLElement {
  get value() :string {
    return this.getAttribute('value') ?? '';
  }

  set value(val:string) {
    console.trace();
    this.setAttribute('value', val);
    this.el.intrans.value = String(parseInt(this.value, 16));
    this.el.intransnum.value = String(parseInt(this.value, 16));
  }


  updateValue(e :Event) :void {
    const target = e.target as HTMLElement;
    if (target.id === 'trsnum') {
      this.value = ('0' + Number(this.el.intransnum.value).toString(16)).slice(-2);
      console.log(this.value);
    } else {
      this.value = ('0' + Number(this.el.intrans.value).toString(16)).slice(-2);
      console.log(this.value);
    }
  }

  el:Elements;

  constructor() {
    super();

    const shadow = this.attachShadow({ mode: 'open' });
    const div = create(shadow, 'div', { id: 'better_range' });
    // tranparency input
    const transValue = String(parseInt(this.value.slice(7, 9), 16));
    const intrans = create(div, 'input', { id: 'trs', type: 'range', min: '0', max: '255', value: transValue });
    const intransnum = create(div, 'input', { id: 'trsnum', type: 'number', min: '0', max: '255', value: transValue });
    const labelnum = create(div, 'label', { id: 'col', for: 'trsnum' }, '%');

    intrans.addEventListener('input', this.updateValue.bind(this));
    intransnum.addEventListener('input', this.updateValue.bind(this));

    this.el = {
      intrans,
      labelnum,
      intransnum,
    };

    // decide which one of them is selected
  }
}
