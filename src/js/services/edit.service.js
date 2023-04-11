import * as ui from '../services/ui.service.js';
import * as options from '../lib/options.js';
import * as io from './io.service.js';
import * as syncService from './sync.service.js';

import { saveChanges } from '../index.js';
import { OPTS } from '../lib/options.js';
import { setFavicon, newUuid } from '../lib/util.js';
import { updateAndDisplayAgenda, updateAndDisplayAgendas } from './agenda.service.js';
import { domToJsonSingle, jsonElementToDom } from './parser.service.js';

export function editLink(element) {
  // Make sure that the link has an identifier
  if (!element.getAttribute('ident')) {
    element.setAttribute('ident', newUuid());
  }

  const editWindow = document.createElement('edit-window');
  document.body.appendChild(editWindow);

  const { backgroundColour, foregroundColour } = ui.getColours(element);
  const iconSize = element.querySelector('.favicon')?.style.width.replace(/[^0-9.]/g, '') || 1;

  const previewElement = jsonElementToDom(domToJsonSingle(element));
  previewElement.style.flexGrow = 0;
  previewElement.iconSize = iconSize;

  editWindow.init({
    element,
    previewElement,
    title: chrome.i18n.getMessage('edit_link'),
    callBack: (properties, previewElement, dialog) => {
      if (!properties.url) {
        if (!OPTS.allowEmptyUrl) {
          ui.wiggleElement(dialog.querySelector('label#url input'));
          return true;
        }

        previewElement?.removeAttribute?.('href');
        previewElement?.querySelector?.('.favicon')?.remove?.();
      }

      if (previewElement) {
        previewElement.style.flexGrow = 1;
        element.replaceWith(previewElement);
        element = previewElement;
      }

      // Complete
      saveChanges({ newChanges: true });
      ui.flash(element);
    },
    properties: [
      {
        name: 'name',
        type: 'better-text',
        value: {
          text: element.textContent,
          mode: element.style.whiteSpace === 'pre-wrap' ? 'multi' : 'single',
        },
        placeholder: 'Name',
        locale: { primary: 'name', secondary: 'placeholder_item_name' },
        updateAction: (value) => {
          if (value.mode === 'multi') {
            previewElement.style.whiteSpace = 'pre-wrap';
          } else { previewElement.style.whiteSpace = 'unset'; }

          const favicon = previewElement.querySelector('.favicon');
          previewElement.textContent = value.value;
          if (favicon) { previewElement.prepend(favicon); }
        },
      },
      {
        name: 'url',
        type: 'text',
        value: element.href,
        placeholder: 'URL',
        locale: {
          primary: 'link',
          secondary: 'placeholder_url',
        },
        updateAction: (value) => {
          if (value) {
            previewElement.href = value;
            setFavicon(previewElement, value, previewElement.iconSize);
          } else {
            previewElement.removeAttribute('href');
            previewElement.querySelector('.favicon')?.remove?.();
          }
        },
      },
      {
        name: 'hideIcon',
        type: 'checkbox',
        value: element.getAttribute('hide-icon') === 'true',
        locale: { primary: 'hide_icon' },
        updateAction: (value) => {
          if (value) {
            previewElement.setAttribute('hide-icon', 'true');
            previewElement.querySelector('.favicon')?.remove?.();
          } else { previewElement.removeAttribute('hide-icon'); }
          setFavicon(previewElement, previewElement.href, previewElement.iconSize);
        },
      },
      {
        name: 'background',
        type: 'colour',
        value: backgroundColour,
        locale: { primary: 'background' },
        updateAction: (value) => (previewElement.style.background = value),
      },
      {
        name: 'foreground',
        type: 'colour',
        value: foregroundColour,
        locale: { primary: 'text' },
        updateAction: (value) => (previewElement.style.color = value),
      },
      {
        name: 'font-size',
        type: 'slider',
        value: element.style.fontSize.replace(/[^0-9.]/g, '') || 1,
        min: 0.5,
        max: 5,
        step: 0.05,
        locale: { primary: 'font_size' },
        updateAction: (value) => (previewElement.style.fontSize = value + 'em'),
      },
      {
        name: 'icon-size',
        type: 'slider',
        value: iconSize,
        min: 0.5,
        max: 5, // Limiting to 5 due to too high quality loss
        step: 0.05,
        locale: { primary: 'icon_size' },
        updateAction: (value) => {
          const favicon = previewElement.querySelector('.favicon');
          if (favicon) favicon.style.width = value + 'rem';
          previewElement.iconSize = value;
        },
      },
    ],
    options: {
      allowEmptyUrl: OPTS.allowEmptyUrl,
    },
  });

  // Propagate scrollbar usage
  editWindow.setAttribute('use-custom-scrollbar', OPTS.useCustomScrollbar);

  // Make sure that links are always draggable
  element.setAttribute('draggable', 'true');
}

function editPanelBase({ element, title, customActions = [], extraProperties = [], callbackExtension = null, cancelCallback = null }) {
  const editWindow = document.createElement('edit-window');
  document.body.appendChild(editWindow);

  const { backgroundColour, foregroundColour, borderColour } = ui.getColours(element);

  // Keep track of original properties - these properties will be edited during the preview to make it easier on the user
  const isTopLevel = element.isTopLevel;
  const folded = element.folded;

  const previewElement = jsonElementToDom(domToJsonSingle(element));
  previewElement.isTopLevel = false;
  previewElement.folded = false;
  previewElement.grow = 0;


  editWindow.init({
    element,
    previewElement,
    title: title || chrome.i18n.getMessage('edit_panel'),
    ident: element.ident,
    customActions,
    callBack: (properties, previewElement) => {
      if (previewElement) {
        element.replaceWith(previewElement);
        element = previewElement;
      }

      // element.singleLineDisplay = properties.singleLineDisplay;
      element.private = properties.private;

      // Restore original properties
      element.isTopLevel = isTopLevel;
      element.folded = folded;

      if (callbackExtension) {
        callbackExtension(properties);
      }

      // Complete
      saveChanges({ newChanges: true });
      ui.flash(element);
    },
    cancelCallback,
    properties: [
      {
        name: 'name',
        type: 'better-text',
        value: {
          text: element.header,
          mode: element.style.whiteSpace === 'pre-wrap' ? 'multi' : 'single',
        },
        placeholder: 'Name',
        locale: { primary: 'name', secondary: 'placeholder_panel_name' },
        updateAction: (value) => {
          if (value.mode === 'multi') {
            previewElement.style.whiteSpace = 'pre-wrap';
          } else { previewElement.style.whiteSpace = 'unset'; }
          previewElement.header = value.value;
        },
      },
      ...extraProperties, // TODO: Add a way to edit where the custom properties are added (maybe add index?) - take into consideration default panel properties
      {
        name: 'background',
        type: 'colour',
        value: backgroundColour,
        locale: { primary: 'background' },
        updateAction: (value) => (previewElement.backgroundColour = value),
      },
      {
        name: 'foreground',
        type: 'colour',
        value: foregroundColour,
        locale: { primary: 'text' },
        updateAction: (value) => (previewElement.textColour = value),
      },
      {
        name: 'direction',
        type: 'switch',
        value: element.getAttribute('direction'),
        options: [{ name: 'horizontal', locale: 'horizontal' }, { name: 'vertical', locale: 'vertical' }],
        selectedOption: element.direction === 'vertical' ? 'vertical' : 'horizontal',
        locale: { primary: 'direction' },
        updateAction: (value) => (previewElement.direction = value),
      },
      {
        name: 'singleLineDisplay',
        type: 'checkbox',
        value: element.singleLineDisplay,
        locale: { primary: 'flex' },
        updateAction: (value) => (previewElement.singleLineDisplay = value),
      },
      { name: 'private', type: 'checkbox', value: element.private, locale: { primary: 'private' } },
      {
        name: 'padding',
        type: 'slider',
        value: element.padding,
        min: 0,
        max: 100,
        step: 1,
        locale: { primary: 'padding' },
        updateAction: (value) => (previewElement.padding = value),
      },
      {
        name: 'border-size',
        type: 'slider',
        value: element.borderSize,
        min: 0,
        max: 30,
        step: 1,
        locale: { primary: 'border_size' },
        updateAction: (value) => (previewElement.borderSize = value),
      },
      {
        name: 'font-size',
        type: 'slider',
        value: element.fontSize,
        min: 0.5,
        max: 5,
        step: 0.05,
        locale: { primary: 'font_size' },
        updateAction: (value) => (previewElement.fontSize = value),
      },
      {
        name: 'border-colour',
        type: 'colour',
        value: borderColour,
        locale: { primary: 'border_colour' },
        updateAction: (value) => (previewElement.borderColour = value),
      },
    ],
    options: {
      allowEmptyUrl: OPTS.allowEmptyUrl,
    },
  });

  // Propagate scrollbar usage
  editWindow.setAttribute('use-custom-scrollbar', OPTS.useCustomScrollbar);
}

export function editPanel(element) {
  let storageActions = [];
  if (OPTS.sync.enabled && syncService.panelShareAvailable()) {
    storageActions = [
      {
        name: 'storage-import',
        title: chrome.i18n.getMessage('panel_import_storage'),
        icon: 'cloud-download',
        event: ({ dialog }) => {
          if (dialog.shadow.querySelector('#storage-import-code')) {
            dialog.shadow.querySelector('#storage-import-code').remove();
            return;
          }

          const label = document.createElement('label');
          label.id = 'storage-import-code';
          const input = document.createElement('input');
          input.placeholder = chrome.i18n.getMessage('sync_panel_code');
          input.type = 'text';

          // Import button
          const importButton = document.createElement('button');
          importButton.textContent = chrome.i18n.getMessage('import');
          importButton.addEventListener('click', () => {
            if (!input.value) return;

            dialog.setLoading(true);
            syncService.getPanel(input.value)
              .then((panelContent) => {
                if (panelContent != null) {
                  const newElement = jsonElementToDom(panelContent, true);
                  newElement.setAttribute('draggable', true);
                  element.replaceWith(newElement);

                  dialog.isVisible = false;
                  saveChanges({ newChanges: true });
                }
                dialog.setLoading(false);
              })
              .catch(() => {
                dialog.setLoading(false);
              });
          });

          // Subscribe button
          const subscribeButton = document.createElement('button');
          subscribeButton.textContent = chrome.i18n.getMessage('subscribe');
          subscribeButton.addEventListener('click', () => {
            if (!input.value) return;

            // TODO: Don't allow subscribing to your own panel (check if panel exists in the page)

            dialog.setLoading(true);
            syncService.getPanel(input.value)
              .then((panelContent) => {
                if (panelContent != null) {
                  panelContent.remotePanelId = input.value;
                  const newElement = jsonElementToDom(panelContent, true);
                  newElement.setAttribute('draggable', true);
                  // newElement.setAttribute('remote-panel-id', input.value);
                  element.replaceWith(newElement);

                  dialog.isVisible = false;
                  saveChanges({ newChanges: true });
                }
                dialog.setLoading(false);
              })
              .catch(() => {
                dialog.setLoading(false);
              });
          });

          label.appendChild(input);
          label.appendChild(importButton);
          label.appendChild(subscribeButton);

          dialog.$customActionsContainer.querySelector('#storage-import').insertAdjacentElement('beforebegin', label);

          input.focus();
        },
      },
      {
        name: 'storage-export',
        title: chrome.i18n.getMessage('panel_export_storage'),
        icon: 'cloud-upload',
        event: async ({ dialog }) => {
          dialog.setLoading(true);
          const json = domToJsonSingle(element);
          const result = await syncService.pushPanel(element.ident, json);
          if (result.ok) { dialog.showIdent = true; }
          dialog.setLoading(false);
        },
      },
    ];
  }

  editPanelBase({
    element,
    customActions: [
      {
        name: 'export',
        title: chrome.i18n.getMessage('panel_export_file'),
        icon: 'file-code',
        event: () => {
          const json = domToJsonSingle(element);
          io.downloadJson({ name: `${element.ident}.json`, data: json });
        },
      },
      {
        name: 'file-import',
        title: chrome.i18n.getMessage('panel_import_file'),
        icon: 'file-download',
        event: ({ dialog }) => {
          io.loadFile().then((content) => {
            const json = JSON.parse(content);
            const newElement = jsonElementToDom(json, true);
            newElement.setAttribute('draggable', true);
            element.replaceWith(newElement);
            dialog.isVisible = false;
          });
        },
      },
      ...storageActions,
    ],
    callbackExtension: () => { updateAndDisplayAgendas(); },
  });
}

export function editAgenda(element) {
  let agenda = OPTS.agendas.filter(agenda => agenda.agendaId === element.id)?.[0];
  editPanelBase(
    {
      element,
      title: chrome.i18n.getMessage('edit_agenda_panel'),
      extraProperties: [
        { name: 'agendaUrl', type: 'text', value: agenda?.agendaUrl || '', locale: { primary: 'url_agenda', secondary: 'placeholder_panel_url_agenda' } },
        { name: 'email', type: 'text', value: agenda?.email || '', locale: { primary: 'email_agenda', secondary: 'placeholder_panel_email_agenda' } },
      ],
      callbackExtension: (properties) => {
        if (agenda == null) {
          agenda = {
            agendaId: element.id,
            agendaUrl: properties.agendaUrl,
            email: properties.email,
            events: [],
          };
          OPTS.agendas.push(agenda);
        } else {
          agenda.agendaUrl = properties.agendaUrl;
          agenda.email = properties.email;
        }

        options.write();
        updateAndDisplayAgenda(agenda);
      },
      cancelCallback: (contentChanged) => {
        if (agenda == null || !contentChanged) return;
        updateAndDisplayAgenda(agenda);
      },
    });
}
