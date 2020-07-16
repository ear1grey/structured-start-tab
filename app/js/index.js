import { loadOptionsWithPromise } from './options.mjs';
import { OPTS } from './defaults.mjs';
import * as toast from './toast.mjs';
import * as tooltip from './tooltip.mjs';
import * as util from './util.mjs';

const store = chrome.storage[OPTS.storage];
const oneDay = 1000 * 60 * 60 * 24;
const fourDays = oneDay * 4;
const twoWeeks = oneDay * 14;
let el = {};
let dragging;
let dummy;
const original = {};

function setValue(where, what, open = false) {
  const elem = document.querySelector(where);
  elem.value = what;
  if (open) elem.open = true;
}

function getValue(where) {
  return document.querySelector(where).value;
}

function setColorValue(where, what) {
  const elem = document.querySelector(where);
  if (what[0] === '!') {
    elem.value = what.slice(1);
  } else {
    elem.value = what;
    elem.open = true;
  }
}

function getColorValue(where) {
  const elem = document.querySelector(where);
  const color = elem.value;
  const open = elem.hasAttribute('open') ? '' : '!';
  return open + color;
}

function linkClicked(e) {
  e.preventDefault();
  if (e.shiftKey) {
    editStart(e.target);
  } else {
    if (e.currentTarget.dataset.href) {
      window.location.href = e.currentTarget.dataset.href;
    }
  }
}

function linkHover(e) {
  feedback(e.target.dataset.href);
}

function linkHoverOut() {
  feedback('');
}

function toHex(x, m = 1) {
  return ('0' + parseInt(m * x, 10).toString(16)).slice(-2);
}

function translateColor(rgba) {
  const parts = rgba.split('(')[1].split(')')[0].split(',');
  const converted = [
    toHex(parts[0]),
    toHex(parts[1]),
    toHex(parts[2]),
    toHex(parts[3], 255),
  ];
  const result = '#' + converted.join('');
  return result;
}

function editStart(elem) {
  el.edit.textContent = ''; // reset
  let dialog;
  const style = window.getComputedStyle(elem);
  if (elem.tagName === 'A') {
    dialog = cloneToDialog('#template_edit_link');
    setValue('#editname', elem.textContent);
    setValue('#editurl', elem.dataset.href);
  } else {
    if (elem.tagName === 'SECTION') {
      dialog = cloneToDialog('#template_edit_panel');
      setValue('#editname', elem.firstElementChild.textContent);
    } else {
      return;
    }
  }

  const bgcol = elem.dataset.bg ? elem.dataset.bg : '!' + translateColor(style.backgroundColor);
  const fgcol = elem.dataset.fg ? elem.dataset.fg : '!' + translateColor(style.color);
  setColorValue('#bgcol', bgcol);
  setColorValue('#fgcol', fgcol);

  dialog.addEventListener('close', closeDialog);
  dialog.addEventListener('cancel', editCancel);
  dialog.showModal();
  el.editing = elem;
  elem.classList.add('edited');

  document.querySelector('#editok').addEventListener('click', editOk);
  document.querySelector('#editcancel').addEventListener('click', editCancel);

  el.editname = document.querySelector('#editname');
}

function editCancel() {
  toast.html('editcancelled', '<h1>Edit cancelled.</h1>');
  closeDialog();
}

function closeDialog() {
  el.dialog.close();
  el.dialog.remove();
  if (el.editing) {
    el.editing.classList.remove('edited');
    flash(el.editing);
  }
  el.editing = null;
}

function setFavicon(el, url) {
  let favicon = el.querySelector('img.favicon');
  if (!favicon) {
    favicon = document.createElement('img');
    favicon.className = 'favicon';
    el.prepend(favicon);
  }

  favicon.src = 'chrome://favicon/' + url;
}

function prepareFavicons() {
  const links = el.main.querySelectorAll('a');
  for (const a of links) {
    setFavicon(a, a.dataset.href);
  }
}

function removeFavicons(root) {
  const images = root.querySelectorAll('img.favicon');
  for (const a of images) {
    a.remove();
  }
}

const createStyleString = (n, v) => v[0] === '!' ? '' : `${n}:${v};`;

// store the updated version
function editOk() {
  if (el.editing.tagName === 'A') {
    el.editing.textContent = getValue('#editname');
    el.editing.dataset.href = getValue('#editurl');
    setFavicon(el.editing, getValue('#editurl'));
  } else {
    if (el.editing.tagName === 'SECTION') {
      el.editing.firstElementChild.textContent = getValue('#editname');
    } else {
      return;
    }
  }

  el.editing.dataset.bg = getColorValue('#bgcol');
  el.editing.dataset.fg = getColorValue('#fgcol');
  let styleString = '';
  styleString += createStyleString('background', el.editing.dataset.bg);
  styleString += createStyleString('color', el.editing.dataset.fg);
  el.editing.style = styleString;

  el.dialog.close();
  saveChanges();
  flash(el.editing);
  el.editing.classList.remove('edited');
  el.editing = null;
}

function saveChanges(makeBackup = true) {
  if (makeBackup) {
    OPTS.backup = OPTS.html;
  }

  const html = document.querySelector('main').innerHTML;
  const tree = treeFromHTML(html);
  removeFavicons(tree);
  cleanTree(tree);

  OPTS.html = tree.body.innerHTML;
  store.set(OPTS);
}

function cleanTree(tree) {
  const all = tree.querySelectorAll('section, a');
  for (const e of all) {
    if (e.classList.length === 0) {
      e.removeAttribute('class');
    }
  }
}


function treeFromHTML(html) {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

function detectKeydown(e) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    const saveButton = document.querySelector('#editok');
    if (saveButton) saveButton.click();
  }

  if (e.code === 'KeyZ' && (e.metaKey || e.ctrlKey)) {
    if (OPTS.backup) {
      const prev = OPTS.html;
      OPTS.html = OPTS.backup;
      OPTS.backup = prev;
    }
    store.set(OPTS, () => {
      prepareContent(OPTS.html);
      toast.html('undo', '<h1>Undo.</h1><p>The previous layout has been reinstated.</p>');
    });
  }

  if (e.code === 'KeyB' && (e.metaKey || e.ctrlKey)) {
    toggleBookmarks(false);
  }

  if (e.code === 'Escape') {
    if (el.body.classList.contains('editing')) {
      editCancel();
    }
  }
}

function createExampleLink(text = 'Example', href = 'http://example.org') {
  const a = document.createElement('a');
  a.dataset.href = href;
  a.textContent = text;
  a.draggable = true;
  setFavicon(a, href);
  addAnchorListeners(a);
  return a;
}

function addLink() {
  if (OPTS.lock) {
    toast.html('locked', '<h1>Page locked.</h1><p>Unlock it in the options page.</p>');
    return;
  }
  const a = createExampleLink();
  el.main.append(a);
}

function addPanel() {
  if (OPTS.lock) {
    toast.html('locked', '<h1>Page locked.</h1><p>Unlock it in the options page.</p>');
    return;
  }
  const div = cloneTemplate('#template_panel', el.main);
  return div;
}

function feedback(msg) {
  el.status.textContent = msg;
}


/**
 * Accept an array of things that are either containers or links
 * inject in the section template
 * use the name
 * stick in the links
 * iff link has links - recurse
 * iff link has no links - inject
 */
export function buildBookmarks(data, target, count) {
  target.textContent = '';
  for (const x of data) {
    if (count === 0) break;

    const indoc = document.querySelector(`[data-href="${x.url}"]`);
    if (indoc || x.dateAdded < Date.now() - twoWeeks) {
      // bookmark is already in doc, or its older
      // than three weeks, so skip it.
      // TODO make this an option?
    } else {
      count--;
      const a = createExampleLink(x.title, x.url);
      a.id = window.btoa(Date.now() * Math.random()).slice(-8).toLowerCase();
      if (x.dateAdded > Date.now() - fourDays) {
        a.classList.add('fresh');
      }
      target.append(a);
    }
  }
}

function addAnchorListeners(a) {
  a.addEventListener('click', linkClicked);
  a.addEventListener('mouseenter', linkHover);
  a.addEventListener('mouseleave', linkHoverOut);
}


/* For a given elem, if it's not a container element, return its parent. */
function findNav(elem) {
  switch (elem.tagName) {
    case 'SECTION': return elem.children[1];
    case 'H1': return elem.nextElementSibling;
    case 'NAV': return elem;
    case 'A': return elem.parentElement;
    case 'MAIN': return elem;
    case 'IMG': return elem.parentElement.parentElement;
  }
  throw new Error("can't safely choose container");
}

/**
 * recursively search up-tree to find the first parent that
 * uses display: flex;
 */
function findParentWithFlex(elem) {
  if (elem === document.body) return elem;
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
function calculatePositionWithinTarget(e) {
  const parentWithFlex = findParentWithFlex(e.target.parentElement.parentElement);
  const style = window.getComputedStyle(parentWithFlex);
  const flexDir = style.getPropertyValue('flex-direction');

  let widthOrHeight, xOrY, offset;
  if (flexDir === 'row') {
    widthOrHeight = 'width';
    xOrY = 'clientX';
    offset = 'x';
  } else {
    widthOrHeight = 'height';
    xOrY = 'clientY';
    offset = 'y';
  }

  const parentRect = e.target.getBoundingClientRect();
  const width = parentRect[widthOrHeight];
  const position = e[xOrY] - parentRect[offset];

  return (position * 2 < width) ? 'beforebegin' : 'afterend';
}

/*
 * add a placeholder element to the position where the
 * current thing would be dropped
 */
function moveElement(e) {
  const tgt = e.target;
  if (dragging === tgt) return; // can't drop on self

  const nav = findNav(tgt);
  const position = tgt === dragging.nextElementSibling ? 'afterend' : 'beforebegin';

  if (dragging.tagName === 'A') {
    if (tgt.tagName === 'H1') return nav.prepend(dragging);
    if (tgt.tagName === 'A') return tgt.insertAdjacentElement(position, dragging);
    if (nav.children.length === 0) return nav.prepend(dragging);
  }

  if (dragging.tagName === 'SECTION') {
    if (dragging.contains(tgt)) return; // can't drop *inside* self
    // if (nav.parentElement === dragging) return; // can't drop *inside* self
    // dropping on a heading inserted before that heading's parent
    if (tgt.tagName === 'H1') {
      const beforeOrAfter = calculatePositionWithinTarget(e);
      return tgt.parentElement.insertAdjacentElement(beforeOrAfter, dragging);
    }

    if (tgt.tagName === 'A') return tgt.insertAdjacentElement(position, dragging);
    if (tgt.tagName === 'MAIN') return nav.append(dragging);

    if (nav.children.length === 0) return nav.prepend(dragging);
  }
}


function checkDragIsWithin(target, preferred) {
  if (target === preferred) {
    return true;
  }
  if (target.parentElement) {
    return checkDragIsWithin(target.parentElement, preferred);
  }
  return false;
}


function replaceElementInOriginalPosition() {
  if (original.sibling) {
    original.parent.insertBefore(dragging, original.sibling);
  } else {
    original.parent.append(dragging);
  }
  dragging = null;
}

function dragEnter() {
  dragging = dragging || createExampleLink('💧');
  dragging.classList.add('dragging');
}

let dragStartedOnThisPage = false;
/* respond when a drag begins */
function dragStart(e) {
  if (OPTS.lock) {
    toast.html('locked', '<h1>Page locked.</h1><p>Unlock it in the options page.</p>');
    return;
  }
  dragStartedOnThisPage = true;
  el.body.classList.add('dragOngoing');
  if (el.body.classList.contains('editing')) return;
  if (e.target.classList.contains('new')) {
    if (e.target.id === 'addlink') {
      dummy = createExampleLink();
      dummy.classList.add('dragging');
      dragging = dummy;
      toast.html('addlink', '<h1>Adding a link&hellip;.</h1><p>Drop anywhere in the page to add it, or press Escape to cancel.</p>');
    } else {
      dummy = addPanel();
      dummy.classList.add('dragging');
      dragging = dummy;
      toast.html('addpanel', '<h1>Adding a panel&hellip;.</h1><p>Drop anywhere in the page to add it, or press Escape to cancel.</p>');
    }
  } else {
    dragging = e.target;
    dragging.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
    toast.html('moving', '<h1>Moving&hellip;</h1><p>Drop anywhere in the page or cancel with the Escape key.</p>');
  }
  original.parent = e.target.parentElement;
  original.sibling = e.target.nextElementSibling;
  // setDragImage(e);  // <-- not sure I like disabling this or if I want it as an option
}

function flash(elem) {
  elem.classList.add('flash');
  window.setTimeout(() => { elem.classList.remove('flash'); }, 1000);
}

// function setDragImage(e) {
//   const img = new Image();
//   img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
//   e.dataTransfer.setDragImage(img, 1, 1);
// }

/* respond if dropping here is ok */
function dragOver(e) {
  if (OPTS.lock) {
    toast.html('locked', '<h1>Page locked.</h1><p>Unlock it in the options page.</p>');
    return;
  }
  if (e.target === el.bin) {
    el.bin.classList.add('over');
  } else {
    el.bin.classList.remove('over');
  }
  if (checkDragIsWithin(e.target, el.main)) {
    e.preventDefault();
    if (!el.toolbar.contains(e.target)) {
      moveElement(e);
    }
  } else {
    // when outside the drop zone, temporary moves are undone
    // and the dragged element returns to its original spot
    if (original.parent === el.toolbar) {
      el.main.append(dragging);
    } else {
      if (original.sibling) {
        original.parent.insertBefore(dragging, original.sibling);
      } else {
        original.parent.append(dragging);
      }
    }
    if (e.target === el.bin) { // gotta allow bin drops too
      e.preventDefault();
      tooltip.reposition(e, 'Drop trash here.');
    }
  }
  prepareDynamicFlex(el.main);
}

function extractDataFromDrop(e) {
  const html = e.dataTransfer.getData('text/html');
  const plainText = e.dataTransfer.getData('text/plain');
  let url, text;
  if (html) {
    const parser = new DOMParser();
    const tdoc = parser.parseFromString(html, 'text/html');
    const link = tdoc.querySelector('a');
    url = link.href;
    text = link.textContent;
  } else {
    try {
      const u = new URL(plainText);
      url = u.toString();
      text = url;
    } catch (e) {
      toast.html('notlink', '<h1>Not a link or URL.</h1><p>Only links from other pages can be imported.</p>');
    }
  }
  if (url) {
    dragging.dataset.href = url;
    setFavicon(dragging, url);
    dragging.textContent = text;
  } else {
    dragging.remove();
  }
}

function dragDrop(e) {
  if (OPTS.lock) {
    toast.html('locked', '<h1>Page locked.</h1><p>Unlock it in the options page.</p>');
    return;
  }
  e.preventDefault();
  dragging.classList.remove('dragging');
  dragging.classList.remove('fresh');
  if (e.target === el.bin) {
    el.trash.lastElementChild.append(dragging);
    saveChanges();
    toast.html('locked', '<h1>Moved.</h1><p>Your item is now in the trash.</p>');
  } else {
    if (!dragStartedOnThisPage) {
      extractDataFromDrop(e);
    }
    // handle all cases
    saveChanges();
  }
  original.parent = null;
  original.sibling = null;
  dummy = null;
  dragging = null;
}


function dragEnd(e) {
  if (OPTS.lock) {
    toast.html('locked', '<h1>Page locked.</h1><p>Unlock it in the options page.</p>');
    return;
  }
  el.body.classList.remove('dragOngoing');
  el.bin.classList.remove('over');
  if (dragging) {
    dragging.classList.remove('dragging');
    dragging.classList.remove('fresh');
    // event must have been cancelled because `dragging` should be reset on drop
    if (e.srcElement.classList.contains('new')) {
      if (dummy) {
        dummy.remove();
        dummy = null;
      }
    } else {
      replaceElementInOriginalPosition();
    }
    toast.html('cancel', '<h1>Drag cancelled.</h1>');
    dummy = null;
  }
  dragStartedOnThisPage = false;
  tooltip.hide();
}

export async function prepareBookmarks(OPTS, target) {
  if (OPTS.showBookmarksSidebar) {
    const count = JSON.parse(OPTS.showBookmarksLimit);
    const bp = new Promise(resolve => {
      chrome.bookmarks.getRecent(count + 20, resolve);
    });
    buildBookmarks(await bp, target, count);
  }
  showBookmarks(OPTS.showBookmarksSidebar);
}

function toggleBookmarks() {
  OPTS.showBookmarksSidebar = !OPTS.showBookmarksSidebar;
  prepareBookmarks(OPTS, el.aside);
  showBookmarks(OPTS.showBookmarksSidebar);
  saveChanges();
}

function showBookmarks(visible = true) {
  if (visible) {
    document.documentElement.style.removeProperty('--bookmark-width');
    document.documentElement.style.removeProperty('--bookmark-margin');
    document.documentElement.style.removeProperty('--bookmark-padding');
    document.documentElement.style.removeProperty('--bookmark-border');
  } else {
    document.documentElement.style.setProperty('--bookmark-width', '0em');
    document.documentElement.style.setProperty('--bookmark-margin', '0em');
    document.documentElement.style.setProperty('--bookmark-padding', '0em');
    document.documentElement.style.setProperty('--bookmark-border', '0em');
  }
}

/* Create an object that can be safely used to refer to elements
 * in the dom. similar to window.id but without the risk of
 * clashing variable names and with the bonus of being able
 * to use a comma separated list of CSS selectors
 */
function prepareElements(selectors = '[id]') {
  const el = {};
  const elems = document.querySelectorAll(selectors);
  elems.forEach(e => { el[e.id ? e.id : e.tagName.toLowerCase()] = e; });
  return el;
}


const findParentSection = elem => {
  if (!elem) return null;
  return elem.tagName === 'SECTION' ? elem : elem.parentElement;
};

const toggleFold = e => {
  if (e.target.tagName === 'A') return;
  if (el.body.classList.contains('editing')) return;
  const foldMe = findParentSection(e.target);
  if (foldMe === el.trash) {
    toast.html('locked', '<h1>Trash panel hidden.</h1>');
    toggleTrash();
    saveChanges();
    return;
  }
  if (foldMe.tagName === 'SECTION') {
    foldMe.classList.toggle('folded');
    saveChanges();
  }
  prepareDynamicFlex(el.main);
};

function editSection(e) {
  if (e.target.tagName === 'A') return;
  if (el.body.classList.contains('editing')) return;
  const foldMe = findParentSection(e.target);
  if (foldMe === el.trash) return;
  if (e.shiftKey && foldMe.tagName === 'SECTION') editStart(foldMe);
}

/** add a fold button to the page if necessary */
function prepareFoldables(selectors = 'main') {
  const elems = [...document.querySelectorAll(selectors)];
  elems.forEach(e => e.addEventListener('dblclick', toggleFold));
  elems.forEach(e => e.addEventListener('click', editSection));
}

function storageChanged(changes) {
  for (const key in changes) {
    OPTS[key] = changes[key].newValue;
    if (key === 'html') {
      prepareMain(OPTS);
//      toast.html('locked', '<h1>Storage updated.</h1>');
      // TODO have a tick to show if changes are saved
    } else {
      util.prepareCSSVariables(OPTS);
      prepareDynamicFlex(el.main);
      prepareBookmarks(OPTS, el.aside);
    }
  }
}


function prepareListeners() {
  const anchors = document.querySelectorAll('a');
  for (const a of anchors) {
    addAnchorListeners(a);
  }
  document.addEventListener('keydown', detectKeydown);

  el.addlink.addEventListener('click', addLink);
  el.addpanel.addEventListener('click', addPanel);

  chrome.storage.onChanged.addListener(storageChanged);
}

function prepareContent(html) {
  const parser = new DOMParser();
  const tempdoc = parser.parseFromString(html, 'text/html');
  const topLevel = tempdoc.querySelectorAll('body>*');
  // clean page
  while (el.main.firstElementChild) {
    el.main.firstElementChild.remove();
  }
  // populate page
  for (const elem of topLevel) {
    el.main.append(elem);
  }
  prepareFavicons();
  prepareListeners();
}

function toggleTrash() {
  // ensure trash is the last thing on the screen
  el.main.append(el.trash);
  el.trash.classList.toggle('open');
  if (el.trash.classList.contains('open')) {
    el.trash.scrollIntoView({ behavior: 'smooth' });
  } else {
    el.main.scrollIntoView({ behavior: 'smooth' });
  }
}


function clearDialog() {
  while (el.dialog.firstElementChild) {
    el.dialog.firstElementChild.remove();
  }
}


function cloneToDialog(selector) {
  el.dialog = document.createElement('dialog');
  el.dialog.id = 'dialog';
  document.body.append(el.dialog);

  const template = document.querySelector(selector);
  const clone = document.importNode(template.content, true);

  clearDialog();
  el.dialog.append(clone);
  return el.dialog;
}

function cloneTemplate(selector, where) {
  const template = document.querySelector(selector);
  const clone = document.importNode(template.content, true);
  where.append(clone);
  return where.lastElementChild;
}

function prepareTrash() {
  el.trash = el.trash || document.querySelector('#trash');
  if (!el.trash) {
    el.trash = cloneTemplate('#template_trash', el.main);
    el.trash.id = 'trash';
  }
  el.trash.classList.add('invisible');
  el.bin.addEventListener('click', toggleTrash);
}

/*
 * make all links within a doc draggable
 */
export function prepareDrag() {
  const links = document.querySelectorAll('main a, .bookmarks a');
  for (const link of links) {
    link.draggable = true;
  }

  document.addEventListener('dragstart', dragStart);
  document.addEventListener('dragover', dragOver);
  document.addEventListener('drop', dragDrop);
  document.addEventListener('dragend', dragEnd);
  document.addEventListener('dragenter', dragEnter);
}

function prepareDynamicFlex(where) {
  if (OPTS.proportionalSections) {
    const topLevelSections = where.querySelectorAll(':scope > section');
    for (const child of topLevelSections) {
      calculateDynamicFlex(child);
    }
  } else {
    const elems = el.main.querySelectorAll('[data-size]');
    elems.forEach(el => { el.removeAttribute('data-size'); });
  }
}

function calculateDynamicFlex(where) {
  let total = 0;
  const nav = where.querySelector('nav');
  for (const child of nav.children) {
    if (child.tagName === 'SECTION') {
      if (child.classList.contains('folded')) {
        total += 1;
      } else {
        total += Math.max(1, calculateDynamicFlex(child));
      }
    }
    if (child.tagName === 'A') {
      total += 1;
    }
  }
  if (where.tagName === 'SECTION') {
    where.dataset.size = total;
  }
  return total;
}

function emptyTrash() {
  el.trash = document.querySelector('#trash');
  el.trash.remove();
  delete el.trash;
  prepareTrash();
  saveChanges(false);
}

function receiveBackgroundMessages(m) {
  switch (m.item) {
    case 'emptytrash': emptyTrash(); break;
    case 'togglebookmarks': toggleBookmarks(); break;
    default: break;
  }
}

function prepareBackgroundListener() {
  chrome.runtime.onMessage.addListener(receiveBackgroundMessages);
}

function prepareMain(OPTS) {
  prepareContent(OPTS.html);
  prepareDrag();
  prepareFoldables();
  prepareDynamicFlex(el.main);
}

async function prepareAll() {
  await loadOptionsWithPromise();
  el = prepareElements('[id], body, main, aside, footer, #trash, #toolbar, #toast');
  prepareBookmarks(OPTS, el.aside);
  util.prepareCSSVariables(OPTS);
  prepareMain(OPTS);
  prepareTrash();
  prepareBackgroundListener();
  toast.prepare();
  feedback('Thank you for using Structured Start Tab');
  tooltip.prepare(OPTS);
}

window.addEventListener('DOMContentLoaded', prepareAll);
