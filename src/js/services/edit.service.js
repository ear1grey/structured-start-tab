import * as ui from '../services/ui.service.js';
import * as options from '../lib/options.js';
import * as io from './io.service.js';
import * as syncService from './sync.service.js';

import { saveChanges } from '../index.js';
import { OPTS } from '../lib/options.js';
import { setFavicon, newUuid } from '../lib/util.js';
import { updateAgendaBackground, displayNewAgenda } from './agenda.service.js';
import { domToJson, jsonElementToDom } from './parser.service.js';

export function editLink(element) {
  // Make sure that the link has an identifier
  if (!element.getAttribute('ident')) {
    element.setAttribute('ident', newUuid());
  }

  const editWindow = document.createElement('edit-window');
  document.body.appendChild(editWindow);

  const { backgroundColour, foregroundColour } = ui.getColours(element);

  editWindow.init({
    element,
    title: chrome.i18n.getMessage('edit_link'),
    callBack: (properties) => {
      // Name
      element.textContent = properties.name.value;
      if (properties.name.mode === 'multi') element.style.whiteSpace = 'pre-wrap';
      else element.style.whiteSpace = 'nowrap';
      // URL
      if (properties.url) {
        element.href = properties.url;
        setFavicon(element, properties.url, properties['icon-size']);
      } else {
        if (!OPTS.allowEmptyUrl) {
          ui.wiggleElement(document.querySelector('#editurl'));
          return;
        }
        element.removeAttribute('href');
      }
      // Colours
      element.style.background = properties.background;
      element.style.color = properties.foreground;

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
      },
      { name: 'url', type: 'text', value: element.href, placeholder: 'URL', locale: { primary: 'link', secondary: 'placeholder_url' } },
      { name: 'background', type: 'colour', value: backgroundColour, locale: { primary: 'background' } },
      { name: 'foreground', type: 'colour', value: foregroundColour, locale: { primary: 'text' } },
      {
        name: 'font-size',
        type: 'slider',
        value: element.style.fontSize.replace(/[^0-9.]/g, '') || 1,
        min: 0.5,
        max: 5,
        step: 0.05,
        locale: { primary: 'font_size' },
        updateAction: (value) => (element.style.fontSize = value + 'em'),
      },
      {
        name: 'icon-size',
        type: 'slider',
        value: element.querySelector('.favicon')?.style.width.replace(/[^0-9.]/g, '') || 1,
        min: 0.5,
        max: 5, // Limiting to 5 due to too high quality loss
        step: 0.05,
        locale: { primary: 'icon_size' },
        updateAction: (value) => (element.querySelector('.favicon').style.width = value + 'rem'),
      },
    ],
    options: {
      allowEmptyUrl: OPTS.allowEmptyUrl,
    },
  });

  // Make sure that links are always draggable
  element.setAttribute('draggable', 'true');
}

function editPanelBase({ element, title, customActions = [], extraProperties = [], additionalCallback = null }) {
  const editWindow = document.createElement('edit-window');
  document.body.appendChild(editWindow);

  const { backgroundColour, foregroundColour, borderColour } = ui.getColours(element);

  editWindow.init({
    element,
    title: title || chrome.i18n.getMessage('edit_panel'),
    ident: element.ident,
    customActions,
    callBack: (properties) => {
      element.header = properties.name.value;
      if (properties.name.mode === 'multi') element.style.whiteSpace = 'pre-wrap';
      else element.style.whiteSpace = 'nowrap';
      element.backgroundColour = properties.background;
      element.textColour = properties.foreground;
      element.direction = properties.direction;
      element.singleLineDisplay = properties.singleLineDisplay;
      element.private = properties.private;

      if (additionalCallback) {
        additionalCallback(properties);
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
          text: element.header,
          mode: element.style.whiteSpace === 'pre-wrap' ? 'multi' : 'single',
        },
        placeholder: 'Name',
        locale: { primary: 'name', secondary: 'placeholder_panel_name' },
      },
      ...extraProperties, // TODO: Add a way to edit where the custom properties are added (maybe add index?) - take into consideration default panel properties
      { name: 'background', type: 'colour', value: backgroundColour, locale: { primary: 'background' } },
      { name: 'foreground', type: 'colour', value: foregroundColour, locale: { primary: 'text' } },
      {
        name: 'direction',
        type: 'switch',
        value: element.getAttribute('direction'),
        options: [{ name: 'horizontal', locale: 'horizontal' }, { name: 'vertical', locale: 'vertical' }],
        selectedOption: element.direction === 'vertical' ? 'vertical' : 'horizontal',
        locale: { primary: 'direction' },
      },
      { name: 'singleLineDisplay', type: 'checkbox', value: element.singleLineDisplay, locale: { primary: 'flex' } },
      { name: 'private', type: 'checkbox', value: element.private, locale: { primary: 'private' } },
      {
        name: 'padding',
        type: 'slider',
        value: element.padding,
        min: 0,
        max: 100,
        step: 1,
        locale: { primary: 'padding' },
        updateAction: (value) => (element.padding = value),
      },
      {
        name: 'border-size',
        type: 'slider',
        value: element.borderSize,
        min: 0,
        max: 30,
        step: 1,
        locale: { primary: 'border_size' },
        updateAction: (value) => (element.borderSize = value),
      },
      {
        name: 'font-size',
        type: 'slider',
        value: element.fontSize,
        min: 0.5,
        max: 5,
        step: 0.05,
        locale: { primary: 'font_size' },
        updateAction: (value) => (element.fontSize = value),
      },
      {
        name: 'border-colour',
        type: 'colour',
        value: borderColour,
        locale: { primary: 'border_colour' },
        updateAction: (value) => (element.borderColour = value),
      },
    ],
    options: {
      allowEmptyUrl: OPTS.allowEmptyUrl,
    },
  });
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
          const button = document.createElement('button');
          button.textContent = chrome.i18n.getMessage('import');
          button.addEventListener('click', () => {
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

          label.appendChild(input);
          label.appendChild(button);

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
          const json = domToJson({ children: [element] })[0];
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
          const json = domToJson({ children: [element] })[0];
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
      additionalCallback: async (properties) => {
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
        await updateAgendaBackground(agenda);
        await displayNewAgenda(agenda);
      },
    });
}
