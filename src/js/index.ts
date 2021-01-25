import { loadOptionsWithPromise, simulateClick, cloneTemplate } from './options.js';
import { Options, OPTS } from './defaults.js';
import * as toast from './toast.js';
import * as tooltip from './tooltip.js';
import * as util from './util.js';


export interface Elems {
  [index:string]: HTMLElement,
}

const version = '1.6.0';

const storage = OPTS.storage;
const store = chrome.storage[storage];
const oneDay = 1000 * 60 * 60 * 24;
const fourDays = oneDay * 4;
const twoWeeks = oneDay * 14;

let dialog:HTMLDialogElement|undefined;
let dragging:HTMLElement|undefined;
let dummy:HTMLElement;
let els:Elems;

interface Original {
  sibling?:HTMLElement,
  parent?:HTMLElement
};

const original:Original = {};

function setValue(where:string, what:string|null, open = false) {
  const elem:HTMLInputElement = <HTMLInputElement> document.querySelector(where);
  elem.value = what ?? "";
  if (open) elem.dataset.open = "true";
}

function getValue(where:string) {
  return (<HTMLInputElement> document.querySelector(where)).value;
}

function setColorValue(where:string, what:string) {
  const elem:HTMLInputElement = <HTMLInputElement> document.querySelector(where);
  if (what[0] === '!') {
    elem.value = what.slice(1);
  } else {
    elem.value = what;
    elem.dataset.open = "true";
  }
}

function getColorValue(where:string) {
  const elem:HTMLInputElement = <HTMLInputElement> document.querySelector(where);
  const color = elem.value;
  const open = elem.dataset.open ? '' : '!';
  return open + color;
}

function linkClicked(e:MouseEvent) {
  if (e.shiftKey) {
    e.preventDefault();
    if (e.target instanceof HTMLElement) {
      editStart(e.target);
    }
  }
}

function toHex(x:number, m = 1) {
  return ('0' + parseInt(String(m * x), 10).toString(16)).slice(-2);
}

function translateColor(rgba:string) {
  let parts = rgba.split('(')[1].split(')')[0].split(',');
  const converted = [
    toHex(Number(parts[0])),
    toHex(Number(parts[1])),
    toHex(Number(parts[2])),
    toHex(Number(parts[3]), 255),
  ];
  const result = '#' + converted.join('');
  return result;
}

function editStart(elem:HTMLElement) {
  els.edit.textContent = ''; // reset
  const style = window.getComputedStyle(elem);
  if (elem instanceof HTMLAnchorElement) {
    cloneToDialog('#template_edit_link');
    setValue('#editname', elem.textContent);
    setValue('#editurl', elem.href);
  } else {
    if (elem.tagName === 'SECTION') {
      cloneToDialog('#template_edit_panel');
      setValue('#editname', elem.firstElementChild!.textContent);
    } else {
      return;
    }
  }

  const bgcol = elem.dataset.bg ? elem.dataset.bg : '!' + translateColor(style.backgroundColor);
  const fgcol = elem.dataset.fg ? elem.dataset.fg : '!' + translateColor(style.color);
  setColorValue('#bgcol', bgcol);
  setColorValue('#fgcol', fgcol);

  dialog!.addEventListener('close', closeDialog);
  dialog!.addEventListener('cancel', editCancel);
  dialog!.showModal();
  els.editing = elem;
  elem.classList.add('edited');

  document.querySelector('#editok')!.addEventListener('click', editOk);
  document.querySelector('#editcancel')!.addEventListener('click', editCancel);

  els.editname = document.querySelector('#editname') as HTMLElement;
}

function editCancel() {
  toast.html('editcancelled', '<h1>Edit cancelled.</h1>');
  closeDialog();
}

function closeDialog() {
  dialog!.close();
  dialog!.remove();
  if (els.editing) {
    els.editing.classList.remove('edited');
    flash(els.editing);
  }
  delete els.editing;
}

function setFavicon(elem:HTMLElement, url:string) {
  let favicon = elem.querySelector('img.favicon') as HTMLImageElement|null;
  if (!favicon) {
    favicon = document.createElement('img');
    favicon.className = 'favicon';
    elem.prepend(favicon);
  }

  favicon.src = 'chrome://favicon/' + url;
}

function prepareFavicons() {
  const links = els.main.querySelectorAll('a');
  for (const a of links) {
    setFavicon(a, a.href);
  }
}

function removeFavicons(root:Document) {
  const images = root.querySelectorAll('img.favicon');
  for (const a of images) {
    a.remove();
  }
}

const createStyleString = (n:string, v:string) => v[0] === '!' ? '' : `${n}:${v};`;


// store the updated version
function editOk() {
  if (els.editing instanceof HTMLAnchorElement) {
    els.editing.textContent = getValue('#editname');
    els.editing.href = getValue('#editurl');
    setFavicon(els.editing, getValue('#editurl'));
  } else {
    if (els.editing.tagName === 'SECTION') {
      els.editing.firstElementChild!.textContent = getValue('#editname');
    } else {
      return;
    }
  }

  els.editing.dataset.bg = getColorValue('#bgcol');
  els.editing.dataset.fg = getColorValue('#fgcol');
  let styleString = '';
  styleString += createStyleString('background', els.editing.dataset.bg);
  styleString += createStyleString('color', els.editing.dataset.fg);
  els.editing.setAttribute("style", styleString);

  dialog!.close();
  saveChanges();
  flash(els.editing);
  els.editing.classList.remove('edited');
  delete els.editing;
}

function saveChanges(makeBackup = true) {
  if (makeBackup) {
    OPTS.backup = OPTS.html;
  }

  const html = els.main.innerHTML;
  const tree = treeFromHTML(html);
  removeFavicons(tree);
  cleanTree(tree);

  OPTS.html = tree.body.innerHTML;
  store.set(OPTS);
}

function cleanTree(tree:Document) {
  const all = tree.querySelectorAll('section, a');
  for (const e of all) {
    if (e.classList.length === 0) {
      e.removeAttribute('class');
    }
  }
}


function treeFromHTML(html:string) {
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

function detectKeydown(e:KeyboardEvent) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    simulateClick('#editok');
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

  if (e.code === 'Escape') {
    if (els.body.classList.contains('editing')) {
      editCancel();
    }
  }
}

function createExampleLink(text = 'Example', href = 'http://example.org') {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
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
  els.main.append(a);
}

function addPanel() {
  if (OPTS.lock) {
    toast.html('locked', '<h1>Page locked.</h1><p>Unlock it in the options page.</p>');
    return;
  }
  const div = cloneTemplateToTarget('#template_panel', els.main);
  return div;
}

/**
 * Accept an array of things that are either containers or links
 * inject in the section template
 * use the name
 * stick in the links
 * iff link has links - recurse
 * iff link has no links - inject
 */
export function buildBookmarks(OPTS:Options, data:chrome.bookmarks.BookmarkTreeNode[], target:HTMLElement, count:number) {
  target.textContent = '';
  for (const x of data) {
    if (count === 0) break;

    const indoc = OPTS.hideBookmarksInPage && document.querySelector(`[href="${x.url}"]`);
    if (indoc || x.dateAdded && x.dateAdded < Date.now() - twoWeeks) {
      // bookmark is already in doc, or its older
      // than three weeks, so skip it.
      // TODO make this an option?
    } else {
      count--;
      const a = createExampleLink(x.title, x.url);
      a.id = window.btoa(String(Date.now() * Math.random())).slice(-8).toLowerCase();
      if (x.dateAdded && x.dateAdded > Date.now() - fourDays) {
        a.classList.add('fresh');
      }
      target.append(a);
    }
  }
}

// TODO this can be done with a single listener and check the target
function addAnchorListeners(a:HTMLElement) {
  a.addEventListener('click', linkClicked);
}


/* For a given elem, if it's not a container element, return its parent. */
function findNav(elem:HTMLElement) {
  let result;
  switch (elem.tagName) {
    case 'SECTION': result = elem.children[1];break;
    case 'H1': result = elem.nextElementSibling;break;
    case 'NAV': result = elem;break;
    case 'A': result = elem.parentElement;break;
    case 'MAIN': result = elem;break;
    case 'IMG': result = elem.parentElement?.parentElement;break;
  }
  if (result) {
    return result;
  }
  throw new Error("can't safely choose container");
}

/**
 * recursively search up-tree to find the first parent that
 * uses display: flex;
 */
function findParentWithFlex(elem:HTMLElement):HTMLElement{
  if (elem === document.body) return elem;
  const style = window.getComputedStyle(elem);
  const display = style.getPropertyValue('display');
  return (display === 'flex') ? elem : findParentWithFlex(elem.parentElement!);
}

/**
 * When called, and passed an event this function will find the
 * first parent that has a flex direction (row or column) and
 * accordingly select width or height charactaristics of the target.
 * The mouse X or Y position within the target are then compared
 * to the target's width or height.  if the mouse is in the first
 * half of the element, 'beforebegin' is returned, otherwise 'afterend'
 */
function calculatePositionWithinTarget(e:DragEvent) {
  const target = e.target! as HTMLElement;
  const parentWithFlex = findParentWithFlex(target.parentElement!.parentElement!);
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

/*
 * add a placeholder element to the position where the
 * current thing would be dropped
 */
function moveElement(e:DragEvent) {
  const tgt = e.target! as HTMLElement;
  if (!dragging || dragging === tgt) return; // can't drop on self

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
      return tgt.parentElement!.insertAdjacentElement(beforeOrAfter, dragging);
    }

    if (tgt.tagName === 'A') return tgt.insertAdjacentElement(position, dragging);
    if (tgt.tagName === 'MAIN') return nav.append(dragging);

    if (nav.children.length === 0) return nav.prepend(dragging);
  }
}


function checkDragIsWithin(target:HTMLElement, preferred:HTMLElement):boolean {
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
  dragging = undefined;
}

function dragEnter() {
  dragging = dragging || createExampleLink('💧');
  dragging.classList.add('dragging');
}

let dragStartedOnThisPage = false;
/* respond when a drag begins */
function dragStart(e:DragEvent) {
  if (OPTS.lock) {
    toast.html('locked', '<h1>Page locked.</h1><p>Unlock it in the options page.</p>');
    return;
  }
  dragStartedOnThisPage = true;
  els.body.classList.add('dragOngoing');
  if (els.body.classList.contains('editing')) return;
  const target = e.target! as HTMLElement;
  if (target.classList.contains('new')) {
    if (target.id === 'addlink') {
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
    dragging = target;
    dragging.classList.add('dragging');
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.dropEffect = 'move';
    toast.html('moving', '<h1>Moving&hellip;</h1><p>Drop anywhere in the page or cancel with the Escape key.</p>');
  }
  original.parent = target.parentElement!;
  original.sibling = target.nextElementSibling;
  // setDragImage(e);  // <-- not sure I like disabling this or if I want it as an option
}

function flash(elem:HTMLElement) {
  elem.classList.add('flash');
  window.setTimeout(() => { elem.classList.remove('flash'); }, 1000);
}

// function setDragImage(e) {
//   const img = new Image();
//   img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
//   e.dataTransfer.setDragImage(img, 1, 1);
// }

/* respond if dropping here is ok */
function dragOver(e:DragEvent) {
  if (OPTS.lock) {
    toast.html('locked', '<h1>Page locked.</h1><p>Unlock it in the options page.</p>');
    return;
  }
  if (e.target === els.bin) {
    els.bin.classList.add('over');
  } else {
    els.bin.classList.remove('over');
  }
  const target = e.target! as HTMLElement;

  if (checkDragIsWithin(target, els.main)) {
    e.preventDefault();
    if (!els.toolbar.contains(target)) {
      moveElement(e);
    }
  } else {
    // when outside the drop zone, temporary moves are undone
    // and the dragged element returns to its original spot
    if (original.parent === els.toolbar) {
      els.main.append(dragging);
    } else {
      if (original.sibling) {
        original.parent.insertBefore(dragging, original.sibling);
      } else {
        original.parent.append(dragging);
      }
    }
    if (e.target === els.bin) { // gotta allow bin drops too
      e.preventDefault();
      tooltip.reposition(e, 'Drop trash here.');
    }
  }
  prepareDynamicFlex(els.main);
}

function extractDataFromDrop(e:DragEvent) {
  const html = e.dataTransfer!.getData('text/html');
  const plainText = e.dataTransfer!.getData('text/plain');
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
      toast.html('notlink', '<h1>Not a link or URL.</h1><p>Only links from other pages can be imported.</p>');
    }
  }
  if (url) {
    dragging.href = url;
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
  if (e.target === els.bin) {
    els.trash.lastElementChild.append(dragging);
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
  els.body.classList.remove('dragOngoing');
  els.bin.classList.remove('over');
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

export async function prepareBookmarks(OPTS:Options, target:HTMLElement) {
  if (OPTS.showBookmarksSidebar) {
    const count = OPTS.showBookmarksLimit;
    const bp = new Promise<chrome.bookmarks.BookmarkTreeNode[]>(resolve => {
      chrome.bookmarks.getRecent(20 + count, resolve);
    });
    buildBookmarks(OPTS, await bp, target, count);
  }
  showBookmarks(OPTS.showBookmarksSidebar);
}

function toggleBookmarks() {
  OPTS.showBookmarksSidebar = !OPTS.showBookmarksSidebar;
  prepareBookmarks(OPTS, els.bookmarksnav);
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
function prepareElements(selectors = '[id]') :Elems {
  const el:Elems = {};
  const elems = document.querySelectorAll(selectors);
  elems.forEach(e => {
    el[e.id ? e.id : e.tagName.toLowerCase()] = e as HTMLElement;
  });
  return el;
}


function findParentSection(elem?:Element) {
  if (!elem) return null;
  return elem.tagName === 'SECTION' ? elem : elem.parentElement;
};

function toggleFold(e:Event) {
  if (!(e.target instanceof HTMLAnchorElement)) return;
  if (els.body.classList.contains('editing')) return;
  const foldMe = findParentSection(e.target);
  if (foldMe === els.trash) {
    toast.html('locked', '<h1>Trash panel hidden.</h1>');
    toggleTrash();
    saveChanges();
    return;
  }
  if (foldMe?.tagName === 'SECTION') {
    foldMe.classList.toggle('folded');
    saveChanges();
  }
  prepareDynamicFlex(els.main);
};

function editSection(e:Event & {shiftKey?:boolean}) {
  const target = e.target! as HTMLElement;
  if (target.tagName === 'A') return;
  if (els.body.classList.contains('editing')) return;
  const foldMe = findParentSection(target);
  if (foldMe === els.trash) return;
  if (e.shiftKey && foldMe instanceof HTMLElement && foldMe?.tagName === 'SECTION') {
    editStart(foldMe);
  }
}

/** add a fold button to the page if necessary */
function prepareFoldables(selectors = 'main') {
  const elems = [...document.querySelectorAll(selectors)];
  elems.forEach(e => e.addEventListener('dblclick', toggleFold));
  elems.forEach(e => e.addEventListener('click', editSection));
}

interface Changes {
  [key: string]: chrome.storage.StorageChange;
}

function storageChanged(changes:Changes) {
  for (const key in changes) {
    OPTS[key] = changes[key].newValue;
    if (key === 'html') {
      prepareMain(OPTS);
      // TODO have a tick to show if changes are saved
    } else {
      util.prepareCSSVariables(OPTS);
      prepareDynamicFlex(els.main);
      prepareBookmarks(OPTS, els.bookmarksnav);
    }
  }
}


function prepareListeners() {
  const anchors = document.querySelectorAll('a');
  for (const a of anchors) {
    addAnchorListeners(a);
  }
  document.addEventListener('keydown', detectKeydown);

  els.addlink.addEventListener('click', addLink);
  els.addpanel.addEventListener('click', addPanel);

  chrome.storage.onChanged.addListener(storageChanged);
}

function prepareContent(html:string) {
  const parser = new DOMParser();
  const tempdoc = parser.parseFromString(html, 'text/html');
  const topLevel = tempdoc.querySelectorAll('body>*');
  // clean page
  while (els.main.firstElementChild) {
    els.main.firstElementChild.remove();
  }
  // populate page
  for (const elem of topLevel) {
    els.main.append(elem);
  }
  prepareFavicons();
  prepareListeners();
}

function toggleTrash() {
  // ensure trash is the last thing on the screen
  els.main.append(els.trash);
  els.trash.classList.toggle('open');
  if (els.trash.classList.contains('open')) {
    els.trash.scrollIntoView({ behavior: 'smooth' });
  } else {
    els.main.scrollIntoView({ behavior: 'smooth' });
  }
}


function clearDialog() {
  while (dialog?.firstElementChild) {
    dialog.firstElementChild.remove();
  }
}

interface PregnantHTMLElement extends HTMLDialogElement {
  lastElementChild:HTMLElement,
  firstElementChild:HTMLElement
}

function cloneToDialog(selector:string) {
  dialog = document.createElement('dialog');
  dialog.id = 'dialog';
  document.body.append(dialog);

  const template = document.querySelector(selector) as HTMLTemplateElement;

  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error("Failed to clone. Selector "+selector+" in dialog must point to a template.");
  }

  const clone = document.importNode(template.content, true);

  if (!clone) {
    throw new Error("Failed to clone "+selector+" in dialog.  Template needs children to continue.  Sad.");
  }

  clearDialog();
  dialog.append(clone);
}

function cloneTemplateToTarget(selector:string, where:HTMLElement) {
  const clone = cloneTemplate(selector)
  where.append(clone);
  return where.lastElementChild! as HTMLElement;
}

function prepareTrash() {
  els.trash = els.trash || document.querySelector('#trash');
  if (!els.trash) {
    els.trash = cloneTemplateToTarget('#template_trash', els.main);
    els.trash.id = 'trash';
  }
  els.trash.classList.add('invisible');
  els.bin.addEventListener('click', toggleTrash);
}

/*
 * make all links within a doc draggable
 */
export function prepareDrag() {
  // const links = document.querySelectorAll('main a, .bookmarks a');
  // for (const link of links) {
  //   link.draggable = true;
  // }

  document.addEventListener('dragstart', dragStart);
  document.addEventListener('dragover', dragOver);
  document.addEventListener('drop', dragDrop);
  document.addEventListener('dragend', dragEnd);
  document.addEventListener('dragenter', dragEnter);
}

function prepareDynamicFlex(where:HTMLElement) {
  if (OPTS.proportionalSections) {
    const topLevelSections = where.querySelectorAll(':scope > section');
    for (const child of topLevelSections) {
      calculateDynamicFlex(child as HTMLElement);
    }
  } else {
    const elems = els.main.querySelectorAll('[data-size]');
    elems.forEach(el => { el.removeAttribute('data-size'); });
  }
}

function calculateDynamicFlex(where:HTMLElement) {
  let total = 0;
  const nav = where.querySelector('nav');
  if(nav) {
    for (const child of nav.children) {
      if (child.tagName === 'SECTION') {
        if (child.classList.contains('folded')) {
          total += 1;
        } else {
          total += Math.max(1, calculateDynamicFlex(child as HTMLElement));
        }
      }
      if (child.tagName === 'A') {
        total += 1;
      }
    }
  }
  if (where.tagName === 'SECTION') {
    where.dataset.size = String(total);
  }
  return total;
}

function emptyTrash() {
  delete els.trash;
  document.querySelector('#trash')?.remove();
  prepareTrash();
  saveChanges(false);
}

function receiveBackgroundMessages(m:{item:string}) {
  switch (m.item) {
    case 'emptytrash': emptyTrash(); break;
    case 'togglebookmarks': toggleBookmarks(); break;
    case 'toggle-sidebar': toggleBookmarks(); break;
    default: break;
  }
}

function prepareBackgroundListener() {
  chrome.runtime.onMessage.addListener(receiveBackgroundMessages);
}

function prepareMain(OPTS:Options) {
  prepareContent(OPTS.html);
  prepareDrag();
  prepareFoldables();
  prepareDynamicFlex(els.main);
}

/** Migration **/
function migrateLinks() {
  /* pre 1.6 used data-href */
  for (const o of document.querySelectorAll('a[data-href]') as NodeListOf<HTMLAnchorElement>) {
    o.href = o.dataset.href!;
    delete o.dataset.href;
  }

  /* anchors are draggable anyway and shoudl not have the attr set
   * this was erroneously done before 1.6 */
  for (const o of document.querySelectorAll('a[draggable]')) {
    console.log(o);
    o.removeAttribute('draggable');
  }
}

async function prepareAll() {
  await loadOptionsWithPromise();
  els = prepareElements('[id], body, main, footer, #trash, #toolbar, #toast');
  prepareBookmarks(OPTS, els.bookmarksnav);
  util.prepareCSSVariables(OPTS);
  prepareMain(OPTS);
  prepareTrash();
  prepareBackgroundListener();
  toast.prepare();
  toast.popup(`Structured Start Tab v${version}`);
  tooltip.prepare(OPTS);
  migrateLinks();
}

window.addEventListener('DOMContentLoaded', prepareAll);
