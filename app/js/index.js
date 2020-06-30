import { loadOptionsWithPromise } from './options.mjs';
import { OPTS } from './defaults.mjs';

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
    return feedback("You can't follow a link whilst editing something else.");
  }
  e.preventDefault();
  if (e.shiftKey) {
    editStart(e.target);
  } else {
    window.location.href = e.currentTarget.dataset.href;
  }
}

function linkHover(e) {
  e.currentTarget.dataset.feedback = feedback(e.target.dataset.info || e.target.dataset.href);
}

function linkHoverOut(e) {
  const f = document.querySelector('#' + e.currentTarget.dataset.feedback);
  if (f) f.remove();
  delete e.currentTarget.dataset.feedback;
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

    feedback('Edit cancelled.');
  }
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

  OPTS.html = document.querySelector('main').innerHTML;
  store.set(OPTS, () => {
    el.body.classList.remove('editing');
    feedback('Saved');
  });

  flash(el.editing);
  el.editing = null;
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
      feedback('Undo');
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


let lastMessage = '';
let feedbackSeries = 0;

function feedback(msg) {
  if (msg && msg !== lastMessage) {
    const p = document.createElement('p');
    p.textContent = msg;
    p.id = `f_${feedbackSeries++}`;
    window.setTimeout(() => { if (p) p.remove(); }, 5000);
    el.status.append(p);
    lastMessage = msg;
    return p.id;
  }
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

    const indoc = document.querySelector(`[href="${x.url}"]`);
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

function updateConfig() {
  OPTS.backup = OPTS.html;
  OPTS.html = document.querySelector('main').innerHTML;
  store.set(OPTS, () => feedback('OK'));
}

/* For a given elem, if it's not a container element, return its parent. */
function findNav(elem) {
  switch (elem.tagName) {
    case 'SECTION': return elem.children[1];
    case 'H1': return elem.nextElementSibling;
    case 'NAV': return elem;
    case 'A': return elem.parentElement;
    case 'MAIN': return elem;
  }
  throw new Error("can't safely choose container");
}


/*
 * add a placeholder element to the position where the
 * current thing would be dropped
 */
function moveElement(tgt) {
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
    if (tgt.tagName === 'H1') return tgt.parentElement.parentElement.insertBefore(dragging, tgt.parentElement);
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
      feedback('Drop in page to add link...');
    } else {
      dummy = addPanel();
      dummy.classList.add('dragging');
      dragging = dummy;
      feedback('Drop section where you want it...');
    }
  } else {
    dragging = e.target;
    dragging.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
    feedback('Moving link... drop in page or cancel with Escape key.');
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
      moveElement(e.target);
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
      feedback('Drop here to delete the item.');
    }
  }
}

function extractDataFromDrop(e) {
  debugger;
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
    } catch {
      feedback("Not a link or URL.");
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
    updateConfig();
    feedback(dragging.textContent + ' moved to trash.');
  } else {
    if (!dragStartedOnThisPage) {
      extractDataFromDrop(e);
    }
    // handle all cases
    updateConfig();
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
    // event must have been cancelled because `dragging` should be reset on drop
    if (e.srcElement.classList.contains('new')) {
      if (dummy) {
        dummy.remove();
        dummy = null;
      }
    } else {
      replaceElementInOriginalPosition();
    }
    feedback('Cancelled.');
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
  updateConfig();
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
    feedback('Trash panel hidden.');
    toggleTrash();
    updateConfig();
    return;
  }
  if (foldMe.tagName === 'SECTION') {
    foldMe.classList.toggle('folded');
    updateConfig();
  }
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
  // 6 lines to do the same as innerHTML - keeps mozilla happy
  const parser = new DOMParser();
  const tempdoc = parser.parseFromString(html, 'text/html');
  const topLevel = tempdoc.querySelectorAll('body>*');
  for (const elem of topLevel) {
    el.main.append(elem);
  }
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


async function prepareAll() {
  await loadOptionsWithPromise();
  el = prepareElements('[id], body, main, aside, footer, #trash, #toolbar');
  prepareContent(OPTS.html);
  prepareBookmarks(OPTS, el.aside);
  prepareDrag();
  prepareFoldables();
  prepareTrash();
  makeVisible();
  feedback('Structured Start Tab - Ready');
}

window.addEventListener('DOMContentLoaded', prepareAll);
