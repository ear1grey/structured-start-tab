import { Options } from './defaults.js';

export function prepareCSSVariables(OPTS: Options) :void {
  document.documentElement.style.setProperty('--tiny', `${OPTS.space / 1000}em`);
  document.documentElement.style.setProperty('--page-font-size', `${OPTS.fontsize}%`);
  document.documentElement.classList.toggle('use-custom-scrollbar', OPTS.useCustomScrollbar);
}

export function localizeHtml(doc:DocumentFragment |Document) :void {
  doc.querySelectorAll('[data-locale]').forEach(elem => {
    const messageKey = elem.getAttribute('data-locale');
    if (messageKey !== null) {
      const text = chrome.i18n.getMessage(messageKey);
      if (messageKey.includes('placeholder')) {
        elem.setAttribute('placeholder', text);
      } else if (messageKey.includes('data_info')) {
        const messages = text.split('|');
        elem.setAttribute('data-info', messages[1]);
        elem.innerHTML = messages[0];
      } else {
        elem.innerHTML = text;
      }
    }
  });
}
