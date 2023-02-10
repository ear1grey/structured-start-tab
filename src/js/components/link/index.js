import { defineComponent, setFavicon } from '../../lib/util.js';

export async function loadLinkDefinition() {
  const res = await fetch('/src/js/components/link/index.css');
  const css = await res.text();
  define(css);
}

const define = (css) => {
  class LinkComponent extends HTMLElement {
    constructor() {
      super();

      this.shadow = this.attachShadow({ mode: 'open' });

      // For now this is the only way to load the css only once (not using @import)
      this.shadow.innerHTML = `<style>${css}</style>`;

      this.$link = document.createElement('a');
      this.shadow.appendChild(this.$link);
    }

    // Getters & setters
    get name() { return this.getAttribute('name') || 'Link'; }
    set name(name) { this.setAttribute('name', name); }

    get href() { return this.getAttribute('href') || '#'; }
    set href(href) { this.setAttribute('href', href); }

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

    // Methods
    removeTemps() {
      this.removeAttribute('temp-bg-colour');
      this.removeAttribute('temp-text-colour');
    }

    // Event handlers
    onBackgroundColourChange() {
      this.$link.style.backgroundColor = this.backgroundColour;
    }

    onTextColourChange() {
      this.$link.style.color = this.textColour;
    }

    static get observedAttributes() {
      return [
        'name', 'href', 'background-color', 'text-color', 'temp-bg-colour',
      ];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;

      switch (name) {
        case 'name':
          this.$link.innerText = newValue;
          break;
        case 'href':
          this.$link.href = newValue;
          setFavicon(this.$link, newValue);
          break;
        case 'background-color':
          this.onBackgroundColourChange();
          break;
        case 'temp-bg-colour':
          this.onBackgroundColourChange();
          break;
        case 'text-color':
          this.onTextColourChange();
          break;
        default:
          break;
      }
    }
  }

  defineComponent('sst-link', LinkComponent);
};
