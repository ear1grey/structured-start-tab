import * as util from '../lib/util.js';
import * as toast from '../lib/toast.js';
import * as tooltip from '../lib/tooltip.js';

import { OPTS } from '../../js/lib/options.js';
import { saveChanges } from '../index.js';
import { editLink, editPanel, editAgenda } from './edit.service.js';

let dragging;
let els;
/*
 * make all links within a doc draggable
 */
export function prepareDrag() {
  document.addEventListener('dragstart', dragStart);
  document.addEventListener('dragover', dragOver);
  document.addEventListener('drop', dragDrop);
  document.addEventListener('dragend', dragEnd);
  document.addEventListener('dragenter', dragEnter);
  els = util.prepareElements('[id], body, main, footer, #trash, #toolbar, #toast');

  /* Clear all pending new elements that could have been left in the trash or incorrect drag.
  Only clear when the user is not dragging as panels/links need the .new class whilst being dragged. */
  if (!dragging) {
    for (const element of document.querySelectorAll('.new')) {
    // skip elements in the nav bar
      if (element.parentElement.id === 'toolbarnav') continue;
      element.remove();
    }
  }
}

function dragEnter() {
  if (!dragging) {
    dragging = {
      el: util.createExampleLink('💧'),
    };
  }
  dragging.el.classList.add('dragging');
}

/* respond when a drag begins */
function dragStart(e) {
  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }

  OPTS.jsonBackup = [...OPTS.json];

  document.body.classList.add('dragOngoing');
  if (document.body.classList.contains('editing')) { return; }
  const path = e.path || (e.composedPath && e.composedPath());
  let target = e.target.tagName === 'SST-PANEL' ? path[0] : e.target;
  if (target.tagName === 'IMG') {
    target = target.parentElement;

    // Alternatively, don't allow dragging of images at all
    // e.stopPropagation();
    // e.preventDefault();
    // return;
  }

  let el, dummy;
  // Dummy used when dragging from the toolbar
  if (target.classList.contains('new')) {
    if (target.id === 'addlink') {
      dummy = util.createExampleLink();
      dummy.classList.add('dragging');
      dummy.classList.add('new');
      el = dummy;
      toast.html('addlink', chrome.i18n.getMessage('add_link'));
    } else {
      dummy = util.createPanel(els.main);
      dummy.classList.add('dragging');
      dummy.classList.add('new');
      el = dummy;
      toast.html('addpanel', chrome.i18n.getMessage('add_panel'));
    }
  } else {
    el = target;
    el.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
    toast.html('moving', chrome.i18n.getMessage('moving'));
  }
  dragging = {
    el,
    dummy,
    parent: target.parentElement,
    sibling: target.nextElementSibling,
    startedOnThisPage: true,
  };
}

/* respond if dropping here is ok */
function dragOver(e) {
  if (!dragging) { return; }
  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }

  const target = e.target;
  if (target === els.toolbar || els.toolbar?.contains(target) || target === els.bin || eventPathInvalid(e)) {
    e.preventDefault();
    dragging.dummy?.remove();
    if (target === els.bin) { els.bin.classList.add('over'); }
    return;
  } else {
    els.bin?.classList.remove('over');
  }

  if (els.toolbar?.contains(e.target)) {
    util.replaceElementInOriginalPosition();
  } else {
    e.preventDefault();
    util.moveElement(e, dragging);
  }

  if (els.main != null) { util.prepareDynamicFlex(els.main); }
}

function dragDrop(e) {
  if (!dragging) { return; }
  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }
  let target = e.target;
  while (target && target !== els.main) {
    if (target.id.includes('topsites') || target.id.includes('bookmarksPanel')) {
      toast.html('impossible', chrome.i18n.getMessage('impossible_drop'));
      return;
    }
    target = target.parentElement;
  }
  e.stopPropagation();
  e.preventDefault();
  dragging.el.classList.remove('dragging');
  dragging.el.classList.remove('fresh');

  if (e.target === els.bin) {
    // when we drop into the bin from the toolbar, remove the element from the screen directly
    if (dragging.dummy) {
      dragging.dummy.remove();
      dragging.dummy = null;
    } else {
      els.trash = els.main.querySelector('#trash') || util.cloneTemplateToTarget('#template_trash', els.main);
      els.trash.lastElementChild?.append(dragging.el);
      saveChanges({ newChanges: true });
      toast.html('locked', chrome.i18n.getMessage('locked_moved_to_trash'));
    }
  } else if (e.target === els.toolbar || // Invalid drop elements
      els.toolbar?.contains(e.target) ||
      eventPathInvalid(e) ||
      e.target.id.includes('bookmark') // can't drop on bookmarks
  ) {
    util.replaceElementInOriginalPosition();
    dragging.dummy.remove();
    dragging.dummy = null;
  } else {
    if (!dragging.startedOnThisPage) {
      extractDataFromDrop(e);
    }
    saveChanges({ newChanges: true });
  }
}

function dragEnd() {
  try {
    if (!dragging || !dragging.el.classList.contains('dragging')) {
      if (OPTS.editOnNewDrop && dragging.el.classList.contains('new') && dragging.dummy && els.main) {
        // trigger edit window
        if (dragging.el.tagName === 'A') {
          editLink(dragging.el);
        } else if (dragging.el.id.startsWith('agenda')) {
          editAgenda(dragging.el);
        } else { editPanel(dragging.el); }
      }
      return;
    }
    if (OPTS.lock) {
      toast.html('locked', chrome.i18n.getMessage('locked'));
      return;
    }

    els.body.classList.remove('dragOngoing');
    els.bin.classList.remove('over');

    dragging.el.classList.remove('fresh');

    if (dragging.dummy) {
      dragging.dummy.remove();
    } else {
      util.replaceElementInOriginalPosition();
    }

    dragging.el.classList.remove('dragging');

    dragging = undefined;
    tooltip.hide();
    toast.html('cancel', chrome.i18n.getMessage('drag_cancel'));
  } finally {
    dragging?.el.classList.remove('new');
    els.bin?.classList.remove('over');
  }
}

function extractDataFromDrop(e) {
  if (!dragging || !(dragging.el instanceof HTMLAnchorElement)) { return; }
  const html = e.dataTransfer.getData('text/html');
  const plainText = e.dataTransfer.getData('text/plain');
  let url, text;
  if (html) {
    const parser = new DOMParser();
    const tdoc = parser.parseFromString(html, 'text/html');
    const link = tdoc.querySelector('a');
    if (link) {
      url = link.href;
      text = link.textContent;
    }
  } else {
    try {
      const u = new URL(plainText);
      url = u.toString();
      text = url;
    } catch (e) {
      toast.html('notlink', chrome.i18n.getMessage('not_link'));
    }
  }
  if (url) {
    dragging.el.href = url;
    util.setFavicon(dragging.el, url);
    dragging.el.textContent = text || '';
  } else {
    dragging.el.remove();
  }
}

function eventPathInvalid(e) {
  const path = (e.path || (e.composedPath && e.composedPath()));
  const invalidIds = ['agenda', 'bookmark', 'sidebar'];
  return path.some(elem => invalidIds.some(id => elem.id?.includes(id)));
}
