import * as ui from '../../services/ui.service.js';
import { localizeHtml } from '../../lib/util.js';

fetch('/src/js/components/edit-window/index.html') // Load HTML
  .then(stream => stream.text())
  .then(text =>
    fetch('/src/js/components/edit-window/index.css') // Locs CSS
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
        this.ok();
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
        case 'switch':
          return label.querySelector('input:checked').id.split('-')[1];
        case 'checkbox':
          return label.querySelector('input').checked;
        default:
          return null;
      }
    }

    // Components
    get $dialog() { return this.shadow.querySelector('dialog'); }
    get $title() { return this.shadow.querySelector('#title'); }
    get $customActionsContainer() { return this.shadow.querySelector('#custom-actions-container'); }
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

    init({ title, customActions, properties, callBack, options }) {
      this.$title.textContent = title;
      this._callBack = callBack;
      this._options = options;

      if (customActions) { this.addCustomActions(customActions); }
      if (properties) { this.addProperties(properties); }

      this.isVisible = true;

      localizeHtml(this.shadow);
    }

    addCustomActions(customActions) {
      // TODO: Add tooltip on hover

      for (const action of customActions) {
        const actionElement = document.createElement('a');
        actionElement.id = action.name;
        actionElement.classList.add('custom-action');
        if (action.icon) {
          // import svg icon locally
          fetch(`/src/img/icons/${action.icon}.svg`)
            .then(stream => stream.text())
            .then(text => {
              actionElement.innerHTML = text;
              actionElement.classList.add('icon');
            });
        } else {
          actionElement.textContent = action.name;
        }

        actionElement.addEventListener('click', (event) => {
          action?.event?.({ event, dialog: this });
        });

        this.$customActionsContainer.appendChild(actionElement);
      }
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
          case 'switch':
            propValue = document.createElement('div');
            propValue.classList.add('switch');
            for (const option of property.options) {
              const input = document.createElement('input');
              input.type = 'radio';
              input.name = property.name;
              input.id = `${property.name}-${option.name}`;
              const label = document.createElement('label');
              label.textContent = option.name;
              label.setAttribute('for', input.id);
              label.setAttribute('data-locale', option.locale);

              if (option.name === property.selectedOption) input.checked = true;

              propValue.appendChild(input);
              propValue.appendChild(label);
            }
            break;
          case 'checkbox':
            propValue = document.createElement('input');
            propValue.type = 'checkbox';
            propValue.checked = property.value;
            break;
        }

        if (property.locale?.primary) propName.setAttribute('data-locale', property.locale.primary);
        if (property.locale?.secondary) propValue.setAttribute('data-locale', property.locale.secondary);
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

    ok() {
      if (this._callBack) {
        const resObject = {};
        for (const prop of this._properties) {
          resObject[prop.name] = this.getPropValueByType(this.shadow.querySelector(`#${prop.name}`), prop.type);
        }

        this._callBack(resObject);
      }
      this.isVisible = false;
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
