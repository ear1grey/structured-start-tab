import { defineComponent, getValueOrDefault, setOrRemoveProperty } from '../../lib/util.js';

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

      this.$panel = document.createElement('section');
      this.$panel.setAttribute('part', 'panel');
      this.$header = document.createElement('h1');
      this.$header.setAttribute('part', 'header');
      this.$header.textContent = 'Panel';
      this.$content = document.createElement('nav');
      this.$content.setAttribute('part', 'content');

      this.$panel.append(this.$header, this.$content);
      this.shadow.append(this.$panel);
    }

    static get observedAttributes() {
      return [
        'background-color',
        'text-color',
        'direction',
        'single-line-display',
        'private',
        'header',
        'folded',
        'grow',
        'blur',
        'temp-bg-colour',
        'temp-text-colour',
        'padding',
        'border-colour',
        'border-size',
        'font-size',
      ];
    }

    // Getters & setters
    get content() { return this.$content; }

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

    get textColour() { return getValueOrDefault(this, 'text-color', '!#ddddddaa'); }
    set textColour(color) {
      this.setAttribute('text-color', color.slice(0, 1) + color.slice(1).replace('!', ''));
    }

    get direction() { return this.getAttribute('direction') || 'horizontal'; }
    set direction(direction) { this.setAttribute('direction', direction); }

    get singleLineDisplay() { return this.hasAttribute('single-line-display'); }
    set singleLineDisplay(isSingleLine) { setOrRemoveProperty(this, 'single-line-display', isSingleLine); }

    get private() { return this.hasAttribute('private'); }
    set private(isPrivate) { setOrRemoveProperty(this, 'private', isPrivate); }

    get header() { return getValueOrDefault(this, 'header', this.$panel.firstChild.textContent); }
    set header(header) { this.setAttribute('header', header); }

    get folded() { return this.hasAttribute('folded'); }
    set folded(isFolded) { setOrRemoveProperty(this, 'folded', isFolded); }

    get grow() { return getValueOrDefault(this, 'grow', ''); }
    set grow(grow) { setOrRemoveProperty(this, 'grow', grow); }

    get blur() { return this.hasAttribute('blur'); }
    set blur(isBlur) { setOrRemoveProperty(this, 'blur', isBlur); }

    get padding() { return getValueOrDefault(this, 'padding', '0'); }

    set padding(padding) { setOrRemoveProperty(this, 'padding', padding); }

    get borderColour() { return this.getAttribute('border-colour') || '#0005'; }
    set borderColour(borderColour) { setOrRemoveProperty(this, 'border-colour', borderColour); }

    get borderSize() { return this.getAttribute('border-size') || '1'; }
    set borderSize(borderSize) { setOrRemoveProperty(this, 'border-size', borderSize); }

    get fontSize() { return getValueOrDefault(this, 'font-size', '1'); }
    set fontSize(fontSize) { setOrRemoveProperty(this, 'font-size', fontSize); }

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
      this.$panel.style.backgroundColor = this.backgroundColour;
    }

    onTextColourChange() {
      this.$panel.style.color = this.textColour;
    }

    onDirectionChange() {
      if (this.direction === 'vertical') {
        this.$panel.classList.add('vertical');
      } else {
        this.$panel.classList.remove('vertical');
      }
    }

    onSingleLineDisplayChange() {
      if (this.singleLineDisplay) {
        this.$panel.classList.add('single-line-display');
      } else {
        this.$panel.classList.remove('single-line-display');
      }
    }

    onPrivateChange() {
      if (this.private) {
        this.$panel.classList.add('private');
      } else {
        this.$panel.classList.remove('private');
      }
    }

    onHeaderChange() {
      this.$header.textContent = this.header;
    }

    onFoldChange() {
      if (this.folded && !this.$panel.classList.contains('folded')) {
        this.$panel.classList.add('folded');
      } else if (!this.folded && this.$panel.classList.contains('folded')) {
        this.$panel.classList.remove('folded');
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
        this.$panel.classList.add('blur');
      } else {
        this.$panel.classList.remove('blur');
      }
    }

    onPaddingChange() {
      this.$panel.style.padding = this.padding + 'px';
    }

    onBorderColourChange() {
      this.$panel.style.borderColor = this.borderColour;
    }

    onBorderSizeChange() {
      this.$panel.style.borderWidth = this.borderSize + 'px';
    }

    onFontSizeChange() {
      this.$header.style.fontSize = this.fontSize + 'em';
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
        case 'padding':
          this.onPaddingChange();
          break;
        case 'border-colour':
          this.onBorderColourChange();
          break;
        case 'border-size':
          this.onBorderSizeChange();
          break;
        case 'font-size':
          this.onFontSizeChange();
          break;
      }
    }
  }

  defineComponent('sst-panel', PanelComponent);
};
