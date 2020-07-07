import { loadOptionsWithPromise } from './options.mjs';
import { OPTS } from './defaults.mjs';
import * as toast from './toast.mjs';
import * as tooltip from './tooltip.mjs';

const store = chrome.storage[OPTS.storage];
const oneDay = 1000 * 60 * 60 * 24;
const fourDays = oneDay * 4;
const twoWeeks = oneDay * 14;
let el = {};
let dragging;
let dummy;
const original = {};

const putValue = (where, what) => { document.querySelector(where).value = what; };
const getValue = (where) => document.querySelector(where).value;

function linkClicked(e) {
  if (el.body.classList.contains('editing')) {
    return toast.popup("You can't follow a link whilst editing something else.");
  }
  e.preventDefault();
  if (e.shiftKey) {
    editStart(e.target);
  } else {
    window.location.href = e.currentTarget.dataset.href;
  }
}

function linkHover(e) {
  feedback(e.target.dataset.href);
}

function linkHoverOut() {
  feedback('');
}


function editStart(elem) {
  el.edit.textContent = ''; // reset
  if (elem.tagName === 'A') {
    cloneTemplate('#template_edit_link', el.edit);
    putValue('#editname', elem.textContent);
    putValue('#editurl', elem.dataset.href);
  } else {
    if (elem.tagName === 'SECTION') {
      cloneTemplate('#template_edit_panel', el.edit);
      putValue('#editname', elem.firstElementChild.textContent);
      putValue('#editstyle', elem.getAttribute('style'));
    } else {
      return;
    }
  }
  el.editing = elem;
  el.body.classList.add('editing');
  elem.classList.add('edited');

  document.querySelector('#editok').addEventListener('click', editOk);
  document.querySelector('#editcancel').addEventListener('click', editCancel);

  el.editname = document.querySelector('#editname');
  flash(el.editname);
  flash(elem);
  el.main.setAttribute('disabled', true);
  el.aside.setAttribute('disabled', true);
  el.toolbar.setAttribute('disabled', true);
  el.editname.focus();
  el.editname.select();
}


function editCancel() {
  if (el.body.classList.contains('editing')) {
    el.body.classList.remove('editing');
    el.edit.textContent = '';

    el.main.removeAttribute('disabled');
    el.aside.removeAttribute('disabled');
    el.toolbar.removeAttribute('disabled');

    el.editing.classList.remove('edited');
    flash(el.editing);
    el.editing = null;

    toast.popup('Edit cancelled.');
  }
}

function setFavicon(el, url) {
  let favicon = el.querySelector('img.favicon');
  if (!favicon) {
    console.log('!');
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


// store the updated version
function editOk() {
  if (el.editing.tagName === 'A') {
    el.editing.textContent = getValue('#editname');
    el.editing.dataset.href = getValue('#editurl');
    setFavicon(el.editing, getValue('#editurl'));
    el.editing.classList.remove('edited');
  } else {
    if (el.editing.tagName === 'SECTION') {
      el.editing.firstElementChild.textContent = getValue('#editname');
      el.editing.setAttribute('style', getValue('#editstyle'));
      el.editing.classList.remove('edited');
    } else {
      return;
    }
  }

  el.main.removeAttribute('disabled');
  el.aside.removeAttribute('disabled');
  el.toolbar.removeAttribute('disabled');


  el.body.classList.remove('editing');
  saveChanges();

  flash(el.editing);
  el.editing = null;
}

function saveChanges() {
  OPTS.backup = OPTS.html;

  const html = document.querySelector('main').innerHTML;
  const tree = treeFromHTML(html);
  removeFavicons(tree);
  cleanTree(tree);

  OPTS.html = tree.body.innerHTML;
  store.set(OPTS, () => toast.popup('Saved'));
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

function makeVisible() {
  el.main.classList.add('visible');
  el.aside.classList.add('visible');
}

function detectKeyup(e) {
  if (e.key === 'Meta') {
    el.main.classList.remove('editing');
  }
}

function detectKeydown(e) {
  if (e.key === 'Meta') {
    el.main.classList.add('editing');
  } else {
    el.main.classList.remove('editing');
  }

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
      toast.popup('Previous layout reinstated.');
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
  const a = createExampleLink();
  el.main.append(a);
}

function addPanel() {
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
  dragStartedOnThisPage = true;
  el.body.classList.add('dragOngoing');
  if (el.body.classList.contains('editing')) return;
  if (e.target.classList.contains('new')) {
    if (e.target.id === 'addlink') {
      dummy = createExampleLink();
      dummy.classList.add('dragging');
      dragging = dummy;
      toast.popup('Drop in page to add link...');
    } else {
      dummy = addPanel();
      dummy.classList.add('dragging');
      dragging = dummy;
      toast.popup('Drop section where you want it...');
    }
  } else {
    dragging = e.target;
    dragging.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
    toast.popup('Moving link... drop in page or cancel with Escape key.');
  }
  original.parent = e.target.parentElement;
  original.sibling = e.target.nextElementSibling;
}

function flash(elem) {
  elem.classList.add('flash');
  window.setTimeout(() => { elem.classList.remove('flash'); }, 1000);
}

/* respond if dropping here is ok */
function dragOver(e) {
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
      toast.popup('Drop here to delete the item.');
    }
  }
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
      toast.popup('Not a link or URL.');
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
  e.preventDefault();
  dragging.classList.remove('dragging');
  dragging.classList.remove('fresh');
  if (e.target === el.bin) {
    el.trash.lastElementChild.append(dragging);
    saveChanges();
    toast.popup(dragging.textContent + ' moved to trash.');
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
    toast.popup('Drag cancelled.');
    dummy = null;
  }
  dragStartedOnThisPage = false;
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
    toast.popup('Trash panel hidden.');
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


function prepareListeners() {
  const anchors = document.querySelectorAll('a');
  for (const a of anchors) {
    addAnchorListeners(a);
  }
  document.addEventListener('keydown', detectKeydown);
  document.addEventListener('keyup', detectKeyup);

  el.addlink.addEventListener('click', addLink);
  el.addpanel.addEventListener('click', addPanel);
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
  el.trash.parentElement.append(el.trash);
  el.trash.classList.toggle('open');
  if (el.trash.classList.contains('open')) {
    el.trash.scrollIntoView({ behavior: 'smooth' });
  } else {
    el.main.scrollIntoView({ behavior: 'smooth' });
  }
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

function prepareCSSVariables(OPTS) {
  document.documentElement.style.setProperty('--tiny', Number(OPTS.space) / 1000 + 'em');
  document.documentElement.style.setProperty('--page-font-size', Number(OPTS.fontsize) + '%');
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


async function prepareAll() {
  await loadOptionsWithPromise();
  el = prepareElements('[id], body, main, aside, footer, #trash, #toolbar, #toast');
  prepareContent(OPTS.html);
  prepareBookmarks(OPTS, el.aside);
  prepareCSSVariables(OPTS);
  prepareDrag();
  prepareFoldables();
  prepareTrash();
  makeVisible();
  prepareDynamicFlex(el.main);
  tooltip.prepare(OPTS);
  toast.prepare();
  toast.popup('Structured Start Tab - Ready');
}

window.addEventListener('DOMContentLoaded', prepareAll);
