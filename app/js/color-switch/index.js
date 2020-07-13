
function attachStyleSheet(shadow) {
  const e = document.createElement('link');
  e.setAttribute('rel', 'stylesheet');
  e.setAttribute('type', 'text/css');
  e.setAttribute('href', 'js/color-switch/index.css');
  shadow.append(e);
}

function create(where, what, attrs = {}, text) {
  const x = document.createElement(what);
  where.append(x);
  for (const key of Object.keys(attrs)) {
    x.setAttribute(key, attrs[key]);
  }

  if (text) x.textContent=text;
  return x;
}

export class ColorSwitch extends HTMLElement {

  get open() { return this.hasAttribute('open'); };
  get value() { return this.getAttribute('value'); }
  get auto() { return this.getAttribute('auto'); }
  get manual() { return this.getAttribute('manual'); }
  
  set open(val) {
    val ? this.setAttribute('open', val) : this.removeAttribute('open');
    this.openOrClose();
  }
  
  set value(val) {
    if (val) {
      this.setAttribute('value', val);
      this.el.incol.value = this.value.slice(0,7)
      this.el.intrans.value = parseInt(this.value.slice(7,9), 16)
    }
  }

  set auto(val) { if (val) { this.setAttribute('auto', val); } }
  set manual(val) { if (val) { this.setAttribute('manual', val); } }


  updateValue(e) {
    this.value = this.el.incol.value + ("0"+Number(this.el.intrans.value).toString(16)).slice(-2);
    this.open = this.el.manual.classList.contains('on') ? true : null;
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

  el = {};

  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    attachStyleSheet(shadow);
    this.el.div = create(shadow, 'div', {id: 'top'});

    // top buttons
    this.el.auto = create(this.el.div, 'label', {id: 'auto', for: 'auto'}, this.auto);
    this.el.manual = create(this.el.div, 'label', {id: 'manual', for: 'manual'}, this.manual);
    this.el.auto.addEventListener('click', () => {
      this.el.auto.setAttribute('class', 'on');
      this.el.manual.removeAttribute('class');
      this.el.main.removeAttribute('class');
      this.open = false;
      // this.updateValue();
    })
    this.el.manual.addEventListener('click', () => {
      this.el.manual.setAttribute('class', 'on');
      this.el.auto.removeAttribute('class');
      this.el.main.setAttribute('class', 'on');
      this.open = true;
      // this.updateValue();
    })

    this.el.main = create(this.el.div, 'main', {id: 'main'});    

    // decide which one of them is selected
    this.openOrClose();

    // color input
    const col = this.value.slice(0,7);
    this.el.col = create(this.el.main, 'label', {id: 'col', for: 'pik'}, 'Colour');
    this.el.incol = create(this.el.main, 'input', {id: 'pik', type: 'color', value: col});

    // tranparency input
    const trans = parseInt(this.value.slice(7,9), 16)
    this.el.trans = create(this.el.main, 'label', {id: 'col', for: 'trs'}, 'Tranparency');
    this.el.intrans = create(this.el.main, 'input', { id: 'trs', type: 'range', min:0, max:255, value: trans });
    
    this.el.incol.addEventListener('input', this.updateValue.bind(this));
    this.el.intrans.addEventListener('input', this.updateValue.bind(this));
  }
}

customElements.define('color-switch', ColorSwitch);
