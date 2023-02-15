import { defineComponent } from '../../lib/util.js';

export async function loadPanelDefinition() {
  const res = await fetch('/src/js/components/panel/index.css');
  const css = await res.text();
  define(css);
}

const define = (css) => {
  class PanelComponent extends HTMLElement {
    constructor() {
      super();

      this.shadow = this.attachShadow({ mode: 'open' });

      // For now this is the only way to load the css only once (not using @import)
      this.shadow.innerHTML = `<style>${css}</style>`;

      this._panel = document.createElement('section');
      this._panel.setAttribute('part', 'panel');
      this._header = document.createElement('h1');
      this._header.setAttribute('part', 'header');
      this._header.textContent = 'Panel';
      this._content = document.createElement('nav');
      this._content.setAttribute('part', 'content');

      this._panel.append(this._header, this._content);
      this.shadow.append(this._panel);
    }

    static get observedAttributes() {
      return [
        'background-color', 'text-color', 'direction', 'single-line-display', 'private', 'header', 'folded', 'grow', 'blur', 'temp-bg-colour', 'temp-text-colour',
      ];
    }

    // Getters & setters
    get content() { return this._content; }

    get ident() { return this.getAttribute('ident'); }

    // Exclamation mark used to identify if the value is default or not
    get backgroundColour() {
      return this.tempBackgroundColour
        ? this.tempBackgroundColour
        : this.getAttribute('background-color') || '!#00000019';
    }

    set backgroundColour(color) {
      this.setAttribute('background-color', color.slice(0, 1) + color.slice(1).replace('!', ''));
    }

    get tempBackgroundColour() { return this.getAttribute('temp-bg-colour'); }
    set tempBackgroundColour(color) { this.setAttribute('temp-bg-colour', color); }

    get textColour() { return this.getAttribute('text-color') || '!#ddddddaN'; }
    set textColour(color) {
      this.setAttribute('text-color', color.slice(0, 1) + color.slice(1).replace('!', ''));
    }

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

    get header() { return this.getAttribute('header') == null ? this._panel.firstChild.textContent : this.getAttribute('header'); }
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
    set grow(grow) {
      if (grow === '') {
        this.removeAttribute('grow');
      } else {
        this.setAttribute('grow', grow);
      }
    }

    get blur() { return this.hasAttribute('blur'); }
    set blur(isBlur) {
      if (isBlur) {
        this.setAttribute('blur', '');
      } else {
        this.removeAttribute('blur');
      }
    }

    // Methods
    toggleFold() {
      this.folded = !this.folded;
    }

    removeTemps() {
      this.removeAttribute('temp-bg-colour');
      this.removeAttribute('temp-text-colour');
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

      this.onGrowChange();
    }

    onGrowChange() {
      if (this.tagName === 'SST-PANEL') {
        this.style.flexGrow = this.folded ? 'unset' : this.grow;
      } else {
        this.getRootNode().style.flexGrow = this.folded ? 'unset' : this.grow;
      }
    }

    onBlurChange() {
      if (this.blur && this.private) {
        this._panel.classList.add('blur');
      } else {
        this._panel.classList.remove('blur');
      }
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
        case 'blur':
          this.onBlurChange();
          break;
        case 'temp-bg-colour':
          this.onBackgroundColourChange();
          break;
      }
    }
  }

  defineComponent('sst-panel', PanelComponent);
};
