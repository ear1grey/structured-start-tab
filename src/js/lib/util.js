import * as toast from '../lib/toast.js';
import { OPTS } from '../../js/lib/options.js';

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

export function createExampleLink(text = chrome.i18n.getMessage('example'), href = 'http://example.org') {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  setFavicon(a, href);
  addAnchorListeners(a);
  return a;
}

export function addAnchorListeners(a, event) {
  a.addEventListener('click', event);
}

export function createPanel(target, animation = true, after = true) {
  const panel = document.createElement('sst-panel');
  panel.setAttribute('draggable', 'true');

  if (after) target.append(panel);
  else target.prepend(panel);

  if (animation) {
    panel.scrollIntoView({ behavior: 'smooth' });
    toast.html('addpanel', chrome.i18n.getMessage('add_panel_auto'));
    panel.classList.add('flash');
    panel.addEventListener('animationend', () => { panel.classList.remove('flash'); });
  }

  return panel;
}

/*
 * add a placeholder element to the position where the
 * current thing would be dropped
 */
export function moveElement(e, dragging) {
  const tgt = findTarget(e);
  if (!dragging || dragging.el === tgt) { return; } // can't drop on self
  if (tgt.id.includes('agenda')) { return; } // can't drop on agenda
  const nav = findNav(tgt);
  const position = tgt === dragging.el.nextElementSibling ? 'afterend' : 'beforebegin';
  if (dragging.el.tagName === 'A') {
    if (tgt.tagName === 'H1') {
      return nav.prepend(dragging.el);
    }
    if (tgt.tagName === 'A') { return tgt.insertAdjacentElement(position, dragging.el); }
    return nav.prepend(dragging.el);
  }
  if (dragging.el.tagName === 'SECTION') {
    // can't drop *inside* self
    if (dragging.el.contains(tgt) || dragging.el.shadow?.contains(tgt)) { return; }

    // dropping on a heading inserted before that heading's parent
    if (tgt.tagName === 'H1') {
      const beforeOrAfter = calculatePositionWithinTarget(e);
      return tgt.parentElement.insertAdjacentElement(beforeOrAfter, dragging.el);
    }
    if (tgt.tagName === 'A') { return tgt.insertAdjacentElement(position, dragging.el); }
    if (tgt.tagName === 'MAIN') { return nav.append(dragging.el); }
    if (nav.children.length === 0) { return nav.prepend(dragging.el); }
  }
  if (dragging.el.tagName === 'SST-PANEL') {
    // can't drop *inside* self
    if (isElementContained(dragging.el, tgt)) { return; }

    // dropping on a heading inserted before that heading's parent
    if (tgt.tagName === 'H1') {
      const closestTarget = findTarget(e);

      if (dragging.el.contains(closestTarget)) return;

      const beforeOrAfter = calculatePositionWithinTarget(e);
      return closestTarget.insertAdjacentElement(beforeOrAfter, dragging.el);
    }
    if (tgt.tagName === 'A') { return tgt.insertAdjacentElement(position, dragging.el); }
    if (tgt.tagName === 'MAIN') { return nav.append(dragging.el); }
    return nav.prepend(dragging.el);
  }
}

export function replaceElementInOriginalPosition(dragging) {
  if (!dragging || !dragging.parent) { return; }
  if (dragging.sibling && dragging.el !== dragging.sibling) {
    dragging.parent.insertBefore(dragging.el, dragging.sibling);
  } else {
    dragging.parent.append(dragging.el);
  }
}

export function prepareDynamicFlex(where) {
  if (OPTS.proportionalSections) {
    const topLevelSections = where.querySelectorAll(':scope > sst-panel, :scope > section, :scope > a');
    for (const child of topLevelSections) {
      calculateDynamicFlex(child);
    }
  }
}

export function calculateDynamicFlex(where) {
  let total = 0;
  if (where._content) {
    for (const child of where._content.children) {
      if (child.tagName === 'SST-PANEL') {
        if (child.folded) {
          total += 1;
        } else {
          total += Math.max(1, calculateDynamicFlex(child));
        }
      }
      if (child.tagName === 'A') {
        total += 1;
      }
    }
  }
  if (where.tagName === 'SST-PANEL') {
    where.grow = String(total > 0 ? total : 1);
  }
  return total;
}

export function findTarget(e) {
  if (e.path[0].tagName === 'A') return e.path[0];
  return e.target.tagName === 'SST-PANEL' ? e.path.find(x => x.tagName === 'SST-PANEL') : e.target;
}

/**
 * recursively search up-tree to find the first parent that
 * uses display: flex;
 */
export function findParentWithFlex(elem) {
  if (elem === document.body) { return elem; }
  const style = window.getComputedStyle(elem);
  const display = style.getPropertyValue('display');
  return (display === 'flex') ? elem : findParentWithFlex(elem.parentElement);
}


/**
 * When called, and passed an event this function will find the
 * first parent that has a flex direction (row or column) and
 * accordingly select width or height charactaristics of the target.
 * The mouse X or Y position within the target are then compared
 * to the target's width or height.  if the mouse is in the first
 * half of the element, 'beforebegin' is returned, otherwise 'afterend'
 */
export function calculatePositionWithinTarget(e) {
  const target = e.target;
  const parentWithFlex = findParentWithFlex(target.parentElement.parentElement);
  const style = window.getComputedStyle(parentWithFlex);
  const flexDir = style.getPropertyValue('flex-direction');
  const parentRect = target.getBoundingClientRect();
  let width, position;
  if (flexDir === 'row') {
    width = parentRect.width;
    position = e.clientX - parentRect.x;
  } else {
    width = parentRect.height;
    position = e.clientY - parentRect.y;
  }
  return (position * 2 < width) ? 'beforebegin' : 'afterend';
}

export function isElementContained(parentElement, childElement) {
  if (parentElement.contains(childElement)) { return true; }
  if (parentElement === childElement) { return true; }

  // check the shadow dom recursively
  if (parentElement.shadowRoot) {
    const shadowChildren = parentElement.shadowRoot.querySelectorAll('*');
    for (const child of shadowChildren) {
      if (isElementContained(child, childElement)) { return true; }
    }
  }

  return false;
}

/* For a given elem, if it's not a container element, return its parent. */
function findNav(elem) {
  let result;
  switch (elem.tagName) {
    case 'SST-PANEL':
      result = elem.shadowRoot.querySelector('nav');
      break;
    case 'SECTION':
      result = elem.children[1];
      break;
    case 'H1':
      result = elem.nextElementSibling;
      break;
    case 'NAV':
      result = elem;
      break;
    case 'A':
      result = elem.parentElement;
      break;
    case 'MAIN':
      result = elem;
      break;
    case 'IMG':
      result = elem.parentElement?.parentElement;
      break;
    case 'AGENDA-ITEM':
      result = elem.parentElement;
      break;
  }
  if (result) {
    return result;
  }
  throw new Error("can't safely choose container");
}

/* Create an object that can be safely used to refer to elements
 * in the dom. similar to window.id but without the risk of
 * clashing variable names and with the bonus of being able
 * to use a comma separated list of CSS selectors
 */
export function prepareElements(selectors = '[id]') {
  const el = {};
  const elems = document.querySelectorAll(selectors);
  elems.forEach(e => {
    el[e.id ? e.id : e.tagName.toLowerCase()] = e;
  });
  return el;
}

export function newUuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0; const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function isBeta() {
  return chrome.runtime.getManifest().version.split('.').length > 3;
}
