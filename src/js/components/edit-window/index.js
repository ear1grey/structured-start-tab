import * as ui from '../../services/ui.service.js';
import { localizeHtml } from '../../lib/util.js';

fetch('js/components/edit-window/index.html') // Load HTML
  .then(stream => stream.text())
  .then(text =>
    fetch('js/components/edit-window/index.css') // Locs CSS
      .then(stream => stream.text())
      .then(css => {
        define(text, css);
      }),
  );

const define = (template, css) => {
  // load css from file
  const link = document.createElement('link');
  link.setAttribute('rel', 'stylesheet');
  link.setAttribute('href', 'js/components/edit-window/index.css');

  class EditWindow extends HTMLElement {
    constructor() {
      super();

      this.shadow = this.attachShadow({ mode: 'open' });
      this.shadow.appendChild(link);

      // For now this is the only way to load the css only once (not using @import)
      this.shadow.innerHTML = `<style>${css}</style> ${template}`;

      // Event listeners
      this.$cancelBtn.addEventListener('click', () => {
        this.isVisible = false;
      });

      this.$okBtn.addEventListener('click', () => {
        if (this._callBack) {
          const resObject = {};
          for (const prop of this._properties) {
            resObject[prop.name] = this.getPropValueByType(this.shadow.querySelector(`#${prop.name}`), prop.type);
          }

          this._callBack(resObject);
        }
        this.isVisible = false;
      });
    }

    getPropValueByType(label, type) {
      switch (type) {
        case 'number':
          return Number(label.querySelector('input').value);
        case 'string':
        case 'text':
          return label.querySelector('input').value;
        case 'colour':
          return label.querySelector('color-switch').value;
        default:
          return null;
      }
    }

    // Components
    get $dialog() { return this.shadow.querySelector('dialog'); }
    get $title() { return this.shadow.querySelector('#title'); }
    get $main() { return this.shadow.querySelector('main'); }
    get $cancelBtn() { return this.shadow.querySelector('#edit-cancel'); }
    get $okBtn() { return this.shadow.querySelector('#edit-ok'); }

    // Props
    get isVisible() { return this.hasAttribute('visible'); }
    set isVisible(value) { value ? this.setAttribute('visible', '') : this.removeAttribute('visible'); }

    // Methods
    onVisibleChanged() {
      if (this.isVisible) {
        this.$dialog.showModal();
      } else {
        this.remove();
      }
    }

    init({ title, properties, callBack, options }) {
      this.$title.textContent = title;
      this._callBack = callBack;
      this._options = options;
      this.addProperties(properties);

      this.isVisible = true;

      localizeHtml(this.shadow);
    }

    addProperties(properties) {
      this._properties = properties;
      for (const property of properties) {
        const label = document.createElement('label');
        label.id = property.name;

        const propName = document.createElement('h4');

        propName.textContent = property.friendlyName;
        label.appendChild(propName);

        let propValue;
        switch (property.type) {
          case 'number':
          case 'string':
          case 'text':
            propValue = document.createElement('input');
            propValue.value = property.value;
            break;
          case 'colour':
            propValue = document.createElement('color-switch');
            propValue.value = property.value;
            propValue.auto = 'Automatic';
            propValue.manual = 'Manual';
            propValue.open = property.value?.[0] !== '!';
            break;
        }

        if (property.locale) {
          propValue.id = `__${property.name}`;
          propValue.setAttribute('data-locale', property.locale);
        }
        if (property.placeholder) propValue.setAttribute('placeholder', property.placeholder);

        label.appendChild(propValue);

        this.$main.appendChild(label);
      }
    }

    isContentValid() {
      // URL
      if (this._options.allowEmptyUrl) return true;
      const url = this.shadow.querySelector('#link')?.querySelector('input')?.value;
      if (url != null && url.trim() === '') {
        ui.wiggleElement(this.shadow.querySelector('#link')?.querySelector('input'));
        return false;
      }

      return true;
    }

    // Structure
    static get observedAttributes() {
      return ['visible'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;

      switch (name) {
        case 'visible':
          this.onVisibleChanged();
          break;
        default:
          break;
      }
    }
  }

  customElements.define('edit-window', EditWindow);
};
