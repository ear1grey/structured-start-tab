import * as types from './types.js';

export function prepareCSSVariables(OPTS: types.Options) :void {
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

export function simulateClick(selector:string) :void {
  const inp = document.querySelector<HTMLElement>(selector);
  inp?.click();
}

interface NonEmptyDocumentFragment extends DocumentFragment {
  lastElementChild:HTMLElement
}

export function cloneTemplate(selector:string):NonEmptyDocumentFragment {
  const template = document.querySelector<HTMLTemplateElement>(selector);
  if (template && template.content.lastElementChild) {
    localizeHtml(template.content);
    return document.importNode(template.content, true) as NonEmptyDocumentFragment;
  }
  throw new Error('Template not found: ' + selector);
}

export function cloneTemplateToTarget(selector:string, where:HTMLElement) :HTMLElement {
  const clone = cloneTemplate(selector);
  where.append(clone);
  return where.lastElementChild! as HTMLElement;
}
