export function prepareCSSVariables(OPTS) {
  document.documentElement.style.setProperty('--tiny', `${OPTS.space / 1000}em`);
  document.documentElement.style.setProperty('--page-font-size', `${OPTS.fontsize}%`);
  document.documentElement.classList.toggle('use-custom-scrollbar', OPTS.useCustomScrollbar);
}
export function localizeHtml(doc) {
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
export function simulateClick(selector) {
  const inp = document.querySelector(selector);
  inp?.click();
}
export function cloneTemplate(selector) {
  const template = document.querySelector(selector);
  if (template && template.content.lastElementChild) {
    localizeHtml(template.content);
    return document.importNode(template.content, true);
  }
  throw new Error('Template not found: ' + selector);
}
export function cloneTemplateToTarget(selector, where, after = true) {
  const clone = cloneTemplate(selector);
  if (where.tagName === 'SECTION') {
    where = where.lastElementChild;
  }
  if (after) {
    where.append(clone);
    return where.lastElementChild;
  } else {
    where.prepend(clone);
    return where.firstElementChild;
  }
}
