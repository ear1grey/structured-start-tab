import * as ui from '../services/ui.service.js';
import * as options from '../lib/options.js';
import * as io from './io.service.js';

import { saveChanges } from '../index.js';
import { OPTS } from '../lib/options.js';
import { setFavicon } from '../lib/util.js';
import { updateAgendaBackground, displayNewAgenda } from './agenda.service.js';
import { domToJson, jsonElementToDom } from './parser.service.js';
import { getPanelCloud, sharePanelCloud } from './cloud.service.js';

const createStyleString = (n, v) => v[0] === '!' ? '' : `${n}:${v};`;

export function editLink(element) {
  const editWindow = document.createElement('edit-window');
  document.body.appendChild(editWindow);

  const { backgroundColour, foregroundColour } = ui.getColours(element);

  editWindow.init({
    title: chrome.i18n.getMessage('edit_link'),
    callBack: (properties) => {
      // Name
      element.textContent = properties.name;
      // URL
      if (properties.url) {
        element.href = properties.url;
        setFavicon(element, properties.url);
      } else {
        if (!OPTS.allowEmptyUrl) {
          ui.wiggleElement(document.querySelector('#editurl'));
          return;
        }
        element.removeAttribute('href');
      }
      // Colours
      let styleString = '';
      styleString += createStyleString('background', properties.background);
      styleString += createStyleString('color', properties.foreground);
      element.setAttribute('style', styleString);

      // Complete
      saveChanges();
      ui.flash(element);
    },
    properties: [
      { name: 'name', type: 'text', value: element.textContent, placeholder: 'Name', locale: { primary: 'name', secondary: 'placeholder_item_name' } },
      { name: 'url', type: 'text', value: element.href, placeholder: 'URL', locale: { primary: 'link', secondary: 'placeholder_url' } },
      { name: 'background', type: 'colour', value: backgroundColour, locale: { primary: 'background' } },
      { name: 'foreground', type: 'colour', value: foregroundColour, locale: { primary: 'text' } },
    ],
    options: {
      allowEmptyUrl: OPTS.allowEmptyUrl,
    },
  });
}

function editPanelBase({ element, title, customActions = [], extraProperties = [], additionalCallback = null }) {
  const editWindow = document.createElement('edit-window');
  document.body.appendChild(editWindow);

  const { backgroundColour, foregroundColour } = ui.getColours(element);

  editWindow.init({
    title: title || chrome.i18n.getMessage('edit_panel'),
    ident: element.ident,
    customActions,
    callBack: (properties) => {
      element.header = properties.name;
      element.backgroundColour = properties.background;
      element.textColour = properties.foreground;
      element.direction = properties.direction;
      element.singleLineDisplay = properties.singleLineDisplay;
      element.private = properties.private;

      if (additionalCallback) {
        additionalCallback(properties);
      }

      // Complete
      saveChanges();
      ui.flash(element);
    },
    properties: [
      { name: 'name', type: 'text', value: element.header, placeholder: 'Name', locale: { primary: 'name', secondary: 'placeholder_panel_name' } },
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
    ],
    options: {
      allowEmptyUrl: OPTS.allowEmptyUrl,
    },
  });
}

export function editPanel(element) {
  let cloudActions = [];
  if (OPTS.cloud.enabled && OPTS.cloud.url) {
    cloudActions = [
      {
        name: 'cloud-import',
        title: chrome.i18n.getMessage('panel_import_cloud'),
        icon: 'cloud-download',
        event: ({ dialog }) => {
          if (dialog.shadow.querySelector('#cloud-import-code')) {
            dialog.shadow.querySelector('#cloud-import-code').remove();
            return;
          }

          const label = document.createElement('label');
          label.id = 'cloud-import-code';
          const input = document.createElement('input');
          input.placeholder = chrome.i18n.getMessage('cloud_panel_code');
          const button = document.createElement('button');
          button.textContent = chrome.i18n.getMessage('import');
          button.addEventListener('click', () => {
            if (!input.value) return;

            dialog.setLoading(true);
            getPanelCloud(input.value)
              .then((panelContent) => {
                if (panelContent != null) {
                  const newElement = jsonElementToDom(panelContent, true);
                  newElement.setAttribute('draggable', true);
                  element.replaceWith(newElement);

                  dialog.isVisible = false;
                }
                dialog.setLoading(false);
              })
              .catch(() => {
                dialog.setLoading(false);
              });
          });

          label.appendChild(input);
          label.appendChild(button);

          dialog.$customActionsContainer.querySelector('#cloud-import').insertAdjacentElement('beforebegin', label);

          input.focus();
        },
      },
      {
        name: 'cloud-export',
        title: chrome.i18n.getMessage('panel_export_cloud'),
        icon: 'cloud-upload',
        event: async ({ dialog }) => {
          dialog.setLoading(true);
          const json = domToJson({ children: [element] })[0];
          const result = await sharePanelCloud(element.ident, json);
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
      ...cloudActions,
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
