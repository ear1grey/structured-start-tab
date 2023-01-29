import * as ui from '../services/ui.service.js';
import * as options from '../lib/options.js';

import { saveChanges } from '../index.js';
import { OPTS } from '../lib/options.js';
import { setFavicon } from '../lib/util.js';
import { updateAgendaBackground, displayNewAgenda } from './agenda.service.js';

const createStyleString = (n, v) => v[0] === '!' ? '' : `${n}:${v};`;

export function editLink(element) {
  const editWindow = document.createElement('edit-window');
  document.body.appendChild(editWindow);

  const { backgroundColour, foregroundColour } = ui.getColours(element);

  editWindow.init({
    title: 'Edit Link',
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

function editPanelBase(element, extraProperties = [], additionalCallback = null) {
  const editWindow = document.createElement('edit-window');
  document.body.appendChild(editWindow);

  const { backgroundColour, foregroundColour } = ui.getColours(element);

  editWindow.init({
    title: 'Edit Panel',
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
  editPanelBase(element);
}

export function editAgenda(element) {
  const index = parseInt(element.id.split('-')[1]);
  editPanelBase(element, [
    { name: 'agendaUrl', type: 'text', value: OPTS.agendas[index]?.agendaUrl, locale: { primary: 'url_agenda', secondary: 'placeholder_panel_url_agenda' } },
    { name: 'email', type: 'text', value: OPTS.agendas[index]?.email, locale: { primary: 'email_agenda', secondary: 'placeholder_panel_email_agenda' } },
  ], (properties) => {
    let index = parseInt(element.id.split('-')[1]);

    if (OPTS.agendas.length === 0) {
      OPTS.agendas = [{}];
      index = 0;
    }

    OPTS.agendas[index].agendaUrl = properties.agendaUrl;
    OPTS.agendas[index].email = properties.email;
    options.write();
    updateAgendaBackground(OPTS.agendas[index], index)
      .then(() => displayNewAgenda(index, OPTS.agendas[index]));
  });
}
