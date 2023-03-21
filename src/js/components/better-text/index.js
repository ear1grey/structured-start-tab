
import { loadAsync, defineComponent, localizeHtml } from '../../lib/util.js';

const getTemplate = loadAsync('/src/js/components/better-text/index.html');
const getStyle = loadAsync('/src/js/components/better-text/index.css');

Promise.all([getTemplate, getStyle]).then(([template, style]) => {
  class BetterTextInput extends HTMLElement {
    constructor() {
      super();

      this.shadow = this.attachShadow({ mode: 'open' });

      // For now this is the only way to load the css only once (not using @import)
      this.shadow.innerHTML = `<style>${style}</style> ${template}`;

      // Event listeners
      this.shadow.querySelectorAll('label').forEach((label) => {
        label.addEventListener('click', () => {
          this.mode = label.getAttribute('for');

          // Remove active from all other
          this.shadow.querySelectorAll('label').forEach((label) => {
            label.classList.remove('active');
          });

          label.classList.add('active');
        });
      });

      this.shadow.querySelector('input').addEventListener('input', () => {
        this.$textarea.value = this.$input.value;
      });

      this.shadow.querySelector('textarea').addEventListener('input', () => {
        this.$input.value = this.$textarea.value;
      });

      localizeHtml(this.shadow);
    }

    // Components
    get $singleLabel() { return this.shadow.querySelector('#single'); }
    get $multiLabel() { return this.shadow.querySelector('#multi'); }
    get $input() { return this.shadow.querySelector('input'); }
    get $textarea() { return this.shadow.querySelector('textarea'); }

    // Props
    get mode() { return this.getAttribute('mode'); }
    set mode(value) { this.setAttribute('mode', value); }

    get value() {
      switch (this.mode) {
        case 'single':
          return this.$input.value;
        case 'multi':
          return this.$textarea.value;
        default:
          return '';
      }
    }

    set value(value) {
      this.$input.value = value;
      this.$textarea.value = value;
    }

    // Methods
    onModeChange() {
      switch (this.mode) {
        case 'single':
          this.$singleLabel.classList.add('active');
          this.$multiLabel.classList.remove('active');
          this.$input.classList.remove('hidden');
          this.$textarea.classList.add('hidden');
          break;
        case 'multi':
          this.$singleLabel.classList.remove('active');
          this.$multiLabel.classList.add('active');
          this.$input.classList.add('hidden');
          this.$textarea.classList.remove('hidden');
          break;
        default:
          this.mode = 'single';
          break;
      }
    }

    // Structure
    static get observedAttributes() {
      return ['mode'];
    }

    connectedCallback() {
      if (this.mode == null) this.mode = 'single';
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;

      switch (name) {
        case 'mode':
          this.onModeChange();
          break;
        default:
          break;
      }
    }
  }

  defineComponent('better-text', BetterTextInput);
});
