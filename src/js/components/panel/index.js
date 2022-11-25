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
    return ['background-color', 'text-color', 'direction', 'single-line-display', 'private', 'header', 'folded', 'grow'];
  }

  // Getters & setters
  get content() { return this._content; }

  get backgroundColour() { return this.getAttribute('background-color') || '#00000019'; }
  set backgroundColour(color) { this.setAttribute('background-color', color); }

  get textColour() { return this.getAttribute('text-color') || '#ddddddaN'; }
  set textColour(color) { this.setAttribute('text-color', color); }

  get direction() { return this.getAttribute('direction') || 'horizontal'; }
  set direction(direction) { this.setAttribute('direction', direction); }

  get singleLineDisplay() { return this.hasAttribute('single-line-display'); }
  set singleLineDisplay(isSingleLine) {
    if (isSingleLine) {
      this.setAttribute('single-line-display', '');
    } else {
      this.removeAttribute('single-line-display');
    }
  }

  get private() { return this.hasAttribute('private'); }
  set private(isPrivate) {
    if (isPrivate) {
      this.setAttribute('private', '');
    } else {
      this.removeAttribute('private');
    }
  }

  get header() { return this.getAttribute('header') || this._panel.firstChild.textContent; }
  set header(header) { this.setAttribute('header', header); }

  get folded() { return this.hasAttribute('folded'); }
  set folded(isFolded) {
    if (isFolded) {
      this.setAttribute('folded', '');
    } else {
      this.removeAttribute('folded');
    }
  }

  get grow() { return this.getAttribute('grow') || ''; }
  set grow(grow) { this.setAttribute('grow', grow); }

  toggleFold() {
    this.folded = !this.folded;
  }

  // Event handlers
  onBackgroundColourChange() {
    this._panel.style.backgroundColor = this.backgroundColour;
  }

  onTextColourChange() {
    this._panel.style.color = this.textColour;
  }

  onDirectionChange() {
    if (this.direction === 'vertical') {
      this._panel.classList.add('vertical');
    } else {
      this._panel.classList.remove('vertical');
    }
  }

  onSingleLineDisplayChange() {
    if (this.singleLineDisplay) {
      this._panel.classList.add('single-line-display');
    } else {
      this._panel.classList.remove('single-line-display');
    }
  }

  onPrivateChange() {
    if (this.private) {
      this._panel.classList.add('private');
    } else {
      this._panel.classList.remove('private');
    }
  }

  onHeaderChange() {
    this._header.textContent = this.header;
  }

  onFoldChange() {
    if (this.folded && !this._panel.classList.contains('folded')) {
      this._panel.classList.add('folded');
    } else if (!this.folded && this._panel.classList.contains('folded')) {
      this._panel.classList.remove('folded');
    }
  }

  onGrowChange() {
    this._panel.style.flexGrow = this.grow;
  }

  attributeChangedCallback(name) {
    switch (name) {
      case 'background-color':
        this.onBackgroundColourChange();
        break;
      case 'text-color':
        this.onTextColourChange();
        break;
      case 'direction':
        this.onDirectionChange();
        break;
      case 'single-line-display':
        this.onSingleLineDisplayChange();
        break;
      case 'private':
        this.onPrivateChange();
        break;
      case 'header':
        this.onHeaderChange();
        break;
      case 'folded':
        this.onFoldChange();
        break;
      case 'grow':
        this.onGrowChange();
        break;
    }
  }
}

customElements.define('sst-panel', PanelComponent);
