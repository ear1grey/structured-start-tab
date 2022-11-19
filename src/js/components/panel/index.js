import { attachStyleSheet } from '../comp-utils.js';

class PanelComponent extends HTMLElement {
  constructor() {
    super();

    this.shadow = this.attachShadow({ mode: 'open' });

    this._panel = document.createElement('section');
    this._panel.setAttribute('part', 'panel');
    this._header = document.createElement('h1');
    this._header.setAttribute('part', 'header');
    this._header.textContent = 'Panel';
    this._content = document.createElement('nav');
    this._content.setAttribute('part', 'content');

    this._panel.append(this._header, this._content);
    this.shadow.append(this._panel);

    attachStyleSheet(this.shadow, 'js/components/panel/index.css');
  }

  static get observedAttributes() {
    return ['folded'];
  }

  get folded() { return this.hasAttribute('folded'); }
  set folded(isFolded) {
    if (isFolded) {
      this.setAttribute('folded', '');
    } else {
      this.removeAttribute('folded');
    }
  }

  toggleFold() {
    this.folded = !this.folded;
  }

  onFoldChange() {
    if (this.folded && !this._panel.classList.contains('folded')) {
      this._panel.classList.add('folded');
    } else if (!this.folded && this._panel.classList.contains('folded')) {
      this._panel.classList.remove('folded');
    }
  }

  attributeChangedCallback(name) {
    if (name === 'folded') { this.onFoldChange(); }
  }
}

customElements.define('sst-panel', PanelComponent);
