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

export function setFavicon(elem, url) {
  let favicon = elem.querySelector('img.favicon');
  if (!favicon) {
    favicon = document.createElement('img');
    favicon.className = 'favicon';
    elem.prepend(favicon);
  }

  if (url) { favicon.src = `chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(url)}&size=32`; }
}

export function rgbaToHex(rgba) {
  const rgbaData = rgba.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+),\s*((\d+)(.(\d+))*)/);

  const red = rgbaData[1];
  const green = rgbaData[2];
  const blue = rgbaData[3];
  const alpha = rgbaData[4];

  return `#${hex(red)}${hex(green)}${hex(blue)}${hex(alpha * 255)}`;
}

function hex(x) {
  return ('0' + parseInt(x).toString(16)).slice(-2);
}

export function isBeta() {
  return chrome.runtime.getManifest().version.split('.').length > 3;
}
