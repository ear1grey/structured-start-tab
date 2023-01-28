import * as ui from '../services/ui.service.js';

import { saveChanges } from '../index.js';
import { OPTS } from '../lib/options.js';
import { setFavicon } from '../lib/util.js';

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
      { name: 'name', friendlyName: 'Name', type: 'text', value: element.textContent, placeholder: 'Name', locale: 'placeholder_item_name' },
      { name: 'url', friendlyName: 'Link', type: 'text', value: element.href, placeholder: 'URL', locale: 'placeholder_url' },
      { name: 'background', friendlyName: 'Background', type: 'colour', value: backgroundColour },
      { name: 'foreground', friendlyName: 'Text', type: 'colour', value: foregroundColour },
    ],
    options: {
      allowEmptyUrl: OPTS.allowEmptyUrl,
    },
  });
}
