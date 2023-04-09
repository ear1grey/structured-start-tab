import * as ui from '../../services/ui.service.js';
import { localizeHtml, addSpinner, removeSpinner, loadAsync, defineComponent, addAnchorListeners, linkClicked, areObjectEquals } from '../../lib/util.js';
import { iconsDictionary } from '../../../img/svg/index.js';
import { domToJsonSingle, jsonElementToDom } from '../../services/parser.service.js';
import '../better-text/index.js';

const getTemplate = loadAsync('/src/js/components/edit-window/index.html');
const getStyle = loadAsync('/src/js/components/edit-window/index.css');

Promise.all([getTemplate, getStyle]).then(([template, style]) => {
  class EditWindow extends HTMLElement {
    constructor() {
      super();

      this.shadow = this.attachShadow({ mode: 'open' });

      // For now this is the only way to load the css only once (not using @import)
      this.shadow.innerHTML = `<style>${style}</style> ${template}`;

      // Event listeners
      this.$cancelBtn.addEventListener('click', () => {
        const contentChanged = !areObjectEquals(domToJsonSingle(this.element), this.originalElement);
        if (this.element && this.originalElement && contentChanged) {
          // restore original element
          const newElement = jsonElementToDom(this.originalElement);
          this.element.parentNode.replaceChild(newElement, this.element);

          if (this.element.tagName === 'A') {
            addAnchorListeners(newElement, linkClicked);
          }
        }
        this.isVisible = false;

        if (this._cancelCallback) { this._cancelCallback(contentChanged); }
      });

      this.$okBtn.addEventListener('click', () => {
        this.ok();
      });

      this.showIdent = false;
      this.onShowIdentChanged();
    }

    getPropValueByType(label, type) {
      switch (type) {
        case 'number':
          return Number(label.querySelector('input').value);
        case 'string':
        case 'text':
          return label.querySelector('input').value;
        case 'better-text':
          return { value: label.querySelector('better-text').value, mode: label.querySelector('better-text').mode };
        case 'colour':
          return label.querySelector('color-switch').value;
        case 'switch':
          return label.querySelector('input:checked').id.split('-')[1];
        case 'checkbox':
          return label.querySelector('input').checked;
        case 'slider':
          return label.querySelector('input').value;
        default:
          return null;
      }
    }

    // Components
    get $dialog() { return this.shadow.querySelector('dialog'); }
    get $title() { return this.shadow.querySelector('#title'); }
    get $ident() { return this.shadow.querySelector('#ident'); }
    get $customActionsContainer() { return this.shadow.querySelector('#custom-actions-container'); }
    get $options() { return this.shadow.querySelector('main #options'); }
    get $preview() { return this.shadow.querySelector('main #preview'); }
    get $cancelBtn() { return this.shadow.querySelector('#edit-cancel'); }
    get $okBtn() { return this.shadow.querySelector('#edit-ok'); }

    // Props
    get isVisible() { return this.hasAttribute('visible'); }
    set isVisible(value) { value ? this.setAttribute('visible', '') : this.removeAttribute('visible'); }

    get showIdent() { return this.hasAttribute('show-ident'); }
    set showIdent(value) { value ? this.setAttribute('show-ident', '') : this.removeAttribute('show-ident'); }

    get useCustomScrollbar() { return this.hasAttribute('use-custom-scrollbar'); }
    set useCustomScrollbar(value) { value ? this.setAttribute('use-custom-scrollbar', '') : this.removeAttribute('use-custom-scrollbar'); }

    // Methods
    onVisibleChanged() {
      if (this.isVisible) {
        this.$dialog.showModal();
      } else {
        this.remove();
      }
    }

    onShowIdentChanged() {
      if (this.showIdent) {
        this.$ident.classList.remove('hidden');
      } else {
        this.$ident.classList.add('hidden');
      }
    }

    onCustomScrollbarChanged() {
      if (this.useCustomScrollbar) {
        this.$dialog.classList.add('use-custom-scrollbar');
      } else {
        this.$dialog.classList.remove('use-custom-scrollbar');
      }
    }

    init({ title, ident, customActions, properties, options, element, previewElement, callBack, cancelCallback }) {
      this.$title.textContent = title;
      this.$ident.textContent = ident;
      this._callBack = callBack;
      this._cancelCallback = cancelCallback;
      this._options = options;

      if (element) {
        this.element = element;
        this.originalElement = domToJsonSingle(element);

        this.$preview.appendChild(previewElement);
      }

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
        actionElement.title = action.title || action.name;
        actionElement.classList.add('custom-action');
        if (action.icon && iconsDictionary[action.icon]) {
          // Load from SVGs dictionary to prevent multiple requests
          actionElement.appendChild(iconsDictionary[action.icon]?.cloneNode(true));
          actionElement.classList.add('icon');
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

        let propValueElement;
        switch (property.type) {
          case 'number':
          case 'string':
          case 'text':
            propValueElement = document.createElement('input');
            propValueElement.type = 'text';
            propValueElement.value = property.value;

            // Add update listener
            propValueElement.addEventListener('input', () => {
              property.updateAction?.(this.getPropValueByType(label, property.type));
            });
            break;
          case 'better-text':
            propValueElement = document.createElement('better-text');
            propValueElement.value = property.value.text;
            propValueElement.mode = property.value.mode;

            // Add update listener
            propValueElement.addEventListener('input', () => {
              property.updateAction?.(this.getPropValueByType(label, property.type));
            });
            propValueElement.addEventListener('click', () => {
              property.updateAction?.(this.getPropValueByType(label, property.type));
            });
            break;
          case 'colour':
            propValueElement = document.createElement('color-switch');
            propValueElement.value = property.value;
            propValueElement.auto = 'Automatic';
            propValueElement.manual = 'Manual';
            propValueElement.open = property.value?.[0] !== '!';

            // Add update listener
            propValueElement.addEventListener('input', () => {
              property.updateAction?.(this.getPropValueByType(label, property.type));
            });
            break;
          case 'switch':
            propValueElement = document.createElement('div');
            propValueElement.classList.add('switch');
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

              // Add update listener
              input.addEventListener('change', () => {
                property.updateAction?.(option.name);
              });

              propValueElement.appendChild(input);
              propValueElement.appendChild(label);
            }
            break;
          case 'checkbox':
            propValueElement = document.createElement('input');
            propValueElement.type = 'checkbox';
            propValueElement.checked = property.value;

            // Add update listener
            propValueElement.addEventListener('input', () => {
              property.updateAction?.(this.getPropValueByType(label, property.type));
            });
            break;
          case 'slider':
            propValueElement = document.createElement('input');
            propValueElement.type = 'range';
            propValueElement.min = property.min;
            propValueElement.max = property.max;
            propValueElement.step = property.step;
            propValueElement.value = property.value;

            // Add update listener
            propValueElement.addEventListener('input', () => {
              property.updateAction?.(this.getPropValueByType(label, property.type));
            });
            break;
        }

        if (property.locale?.primary) propName.setAttribute('data-locale', property.locale.primary);
        if (property.locale?.secondary) propValueElement.setAttribute('data-locale', property.locale.secondary);
        if (property.placeholder) propValueElement.setAttribute('placeholder', property.placeholder);

        label.appendChild(propValueElement);

        this.$options.appendChild(label);
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
      let preventClose = false;
      if (this._callBack) {
        const resObject = {};
        for (const prop of this._properties) {
          resObject[prop.name] = this.getPropValueByType(this.shadow.querySelector(`#${prop.name}`), prop.type);
        }

        preventClose = this._callBack(resObject, this.$preview.firstElementChild, this.$dialog);
      }

      if (!preventClose) { this.isVisible = false; }
    }

    setLoading(value) {
      if (value) addSpinner(this.$title);
      else removeSpinner({ element: this.$title });

      this.shadow.querySelectorAll('button, a').forEach(el => {
        if (value) {
          el.classList.add('disabled');
          el.disabled = true;
        } else {
          el.classList.remove('disabled');
          el.disabled = false;
        }
      });
    }

    // Structure
    static get observedAttributes() {
      return ['visible', 'show-ident', 'use-custom-scrollbar'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (oldValue === newValue) return;

      switch (name) {
        case 'visible':
          this.onVisibleChanged();
          break;
        case 'show-ident':
          this.onShowIdentChanged();
          break;
        case 'use-custom-scrollbar':
          this.onCustomScrollbarChanged();
          break;
        default:
          break;
      }
    }
  }

  defineComponent('edit-window', EditWindow);
});
