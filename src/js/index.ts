import * as util from './lib/util.js';
import * as types from './lib/types.js';
import { OPTS } from './lib/options.js';
import * as options from './lib/options.js';
import * as toast from './lib/toast.js';
import * as tooltip from './lib/tooltip.js';
import { ColorSwitch } from './components/color-switch/index.js';
import { updateAgendaBackground } from './background.js';

export interface Elems {
  [index:string]: HTMLElement,
}

const oneDay = 1000 * 60 * 60 * 24;
const fourDays = oneDay * 4;
const twoWeeks = oneDay * 14;

let dialog:HTMLDialogElement|undefined;
let els:Elems;

interface Dragging {
  el: HTMLElement,
  dummy?: HTMLElement,
  sibling?: Element | null,
  parent?: HTMLElement | null,
  startedOnThisPage?: boolean,
}

let dragging: Dragging | undefined;

function setValue(where:string, what:string|null, open = false) {
  const elem = document.querySelector<HTMLInputElement>(where)!;
  elem.value = what ?? '';
  if (open) elem.dataset.open = 'true';
}

function getValue(where:string) {
  return document.querySelector<HTMLInputElement>(where)!.value;
}

function setColorValue(where:string, what:string) {
  const elem = document.querySelector<ColorSwitch>(where)!;
  if (what[0] === '!') {
    elem.value = what.slice(1);
    elem.open = false;
  } else {
    elem.value = what;
    elem.open = true;
  }
}

function getColorValue(where:string) {
  const elem = document.querySelector<ColorSwitch>(where)!;
  const color = elem.value;
  const open = elem.dataset.open ? '' : '!';
  return open + color;
}

function linkClicked(e:MouseEvent) {
  if (e.target instanceof HTMLElement) {
    if (e.shiftKey) {
      e.preventDefault();
      editStart(e.target);
    } else if (!e.target.id) {
      updateClickCount(e.target);
    }
  }
}

function updateClickCount(a :HTMLElement) {
  const link = a.getAttribute('href');
  if (!link) return;
  if (OPTS.linkStats[link]) {
    OPTS.linkStats[link]++;
  } else {
    OPTS.linkStats[link] = 1;
  }
  options.write();
}

function toHex(x:number, m = 1) {
  return ('0' + parseInt(String(m * x), 10).toString(16)).slice(-2);
}

function translateColor(rgba:string) {
  const parts = rgba.split('(')[1].split(')')[0].split(',');
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
    (document.querySelector('#editname') as HTMLInputElement).select();
  } else {
    if (elem.tagName === 'SECTION') {
      if (elem.id.includes('agenda')) {
        cloneToDialog('#template_edit_panel_agenda');
        const index = parseInt(elem.id.split('-')[1]);
        setValue('#urlInput', OPTS.agendas[index].agendaUrl);
      } else {
        cloneToDialog('#template_edit_panel');
      }
      setValue('#editname', elem.firstElementChild!.textContent);
      if (elem.classList.contains('vertical')) {
        (document.querySelector('#radioVertical') as HTMLInputElement).checked = true;
      }
      if (elem.classList.contains('private')) {
        (document.querySelector('#privateInput') as HTMLInputElement).checked = true;
      }
      if (elem.classList.contains('flex-disabled')) {
        (document.querySelector('#flexInput') as HTMLInputElement).checked = true;
      }
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

  els.editname = document.querySelector<HTMLElement>('#editname')!;
}

function editCancel() {
  toast.html('editcancelled', chrome.i18n.getMessage('edit_cancelled'));
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
  let favicon = elem.querySelector<HTMLImageElement>('img.favicon');
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


function addRemoveClassList(toCheck:string, toAdd:string[], toRemove:string[]) {
  if ((document.querySelector(toCheck) as HTMLInputElement).checked) {
    for (const s of toAdd) {
      els.editing.classList.add(s);
    }
  } else {
    for (const s of toRemove) {
      els.editing.classList.remove(s);
    }
  }
}

// store the updated version
function editOk() {
  if (els.editing instanceof HTMLAnchorElement) {
    els.editing.textContent = getValue('#editname');
    els.editing.href = getValue('#editurl');
    setFavicon(els.editing, getValue('#editurl'));
  } else {
    if (els.editing.tagName === 'SECTION') {
      els.editing.firstElementChild!.textContent = getValue('#editname');
      if ((document.querySelector('#flexInput') as HTMLInputElement).checked) {
        els.editing.classList.add('flex-disabled');
      } else {
        els.editing.classList.remove('flex-disabled');
      }
      addRemoveClassList('#radioVertical', ['vertical'], ['vertical']);
      addRemoveClassList('#privateInput', ['private'], ['private', 'blur']);
      if (els.editing.id.includes('agenda')) {
        const index = parseInt(els.editing.id.split('-')[1]);
        OPTS.agendas[index].agendaUrl = getValue('#urlInput');
      }
    } else {
      return;
    }
  }

  els.editing.dataset.bg = getColorValue('#bgcol');
  els.editing.dataset.fg = getColorValue('#fgcol');
  let styleString = '';
  styleString += createStyleString('background', els.editing.dataset.bg);
  styleString += createStyleString('color', els.editing.dataset.fg);
  els.editing.setAttribute('style', styleString);

  dialog!.close();
  saveChanges();
  flash(els.editing);
  els.editing.classList.remove('edited');
  delete els.editing;
}

function saveChanges(makeBackup = true) {
  if (els.main.classList.contains('heatmap')) {
    toggleHeatMap();
  }
  if (makeBackup) {
    OPTS.backup = OPTS.html;
  }

  const html = els.main.innerHTML;
  const tree = treeFromHTML(html);
  removeFavicons(tree);
  cleanTree(tree);

  OPTS.html = tree.body.innerHTML;
  options.write();

  prepareMain(OPTS);
  util.prepareCSSVariables(OPTS);
  prepareDynamicFlex(els.main);
  prepareBookmarks(OPTS, els.bookmarksnav);
}

function cleanTree(tree:Document) {
  const all = tree.querySelectorAll('section, a');
  for (const e of all) {
    if (e.classList.contains('flash')) e.classList.remove('flash');
    if (e.classList.contains('highlight')) e.classList.remove('highlight');
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
    util.simulateClick('#editok');
  }

  if (e.code === 'KeyZ' && (e.metaKey || e.ctrlKey)) {
    if (OPTS.backup) {
      const prev = OPTS.html;
      OPTS.html = OPTS.backup;
      OPTS.backup = prev;
    }
    options.write();
    prepareContent(OPTS.html);
    toast.html('undo', chrome.i18n.getMessage('undo'));
  }

  if (e.code === 'Escape') {
    if (els.body.classList.contains('editing')) {
      editCancel();
    }
  }
}

function toggleHeatMap() {
  const links = els.main.querySelectorAll('a');
  const numbers: number[] = [];

  for (const a of links) {
    const link = a.getAttribute('href');
    if (link && OPTS.linkStats[link]) {
      numbers.push(OPTS.linkStats[link]);
    }
  }
  const max = Math.max(...numbers);

  els.main.classList.toggle('heatmap');
  if (els.main.classList.contains('heatmap')) {
    for (const a of links) {
      if (!a.id) {
        const link = a.getAttribute('href');
        let color = 'hsl(240, 100%, 50%)';
        if (link && OPTS.linkStats[link]) {
          color = getColorHeatMap(OPTS.linkStats[link], max);
        }
        a.style.backgroundColor = color;
      }
    }
    changeBookmarksToHeatmap();
  } else {
    for (const a of links) {
      if (!a.id) {
        a.style.backgroundColor = '';
      }
    }
    changeBookmarksToHeatmap();
  }
}

function changeBookmarksToHeatmap() {
  els.bookmarksnav.classList.toggle('heatmapLegend');
  if (els.bookmarksnav.classList.contains('heatmapLegend')) {
    const links = els.bookmarksnav.querySelectorAll('a');
    for (const a of links) {
      els.bookmarksnav.removeChild(a);
    }
    els.bookmarks.querySelector('h1')!.textContent = chrome.i18n.getMessage('heatmap_legend');
    util.cloneTemplateToTarget('#heatmap_legend', els.bookmarksnav);
  } else {
    els.bookmarks.querySelector('h1')!.textContent = chrome.i18n.getMessage('bookmarks');
    prepareBookmarks(OPTS, els.bookmarksnav);
  }
}

function getColorHeatMap(value :number, max :number): string {
  const h = (1.0 - (value / max)) * 240;
  return 'hsl(' + String(h) + ', 100%, 50%)';
}


function createExampleLink(text = chrome.i18n.getMessage('example'), href = 'http://example.org') {
  const a = document.createElement('a');
  a.href = href;
  a.textContent = text;
  setFavicon(a, href);
  addAnchorListeners(a);
  return a;
}

function addLinkListener() {
  addLink();
}

function addLink(target? : HTMLElement) {
  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }
  const a = createExampleLink();
  if (target) {
    if (target.tagName === 'SECTION') {
      target.lastElementChild?.append(a);
    } else {
      target.append(a);
    }
  } else {
    els.main.append(a);
  }
  a.scrollIntoView({ behavior: 'smooth' });
  toast.html('addlink', chrome.i18n.getMessage('toast_link_add'));
  flash(a, 'highlight');
}

function createPanel(target : HTMLElement, animation = true, after = true) {
  const div = util.cloneTemplateToTarget('#template_panel', target, after);
  div.firstElementChild!.textContent = chrome.i18n.getMessage('panel');
  if (animation) {
    div.scrollIntoView({ behavior: 'smooth' });
    toast.html('addpanel', chrome.i18n.getMessage('add_panel_auto'));
    div.classList.add('flash');
    div.addEventListener('animationend', () => { div.classList.remove('flash'); });
  }
  return div;
}

function addPanel() {
  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }
  return createPanel(els.main);
}

function addTopSitesPanel() {
  let panel = els.main.querySelector('#topsites');
  if (!panel) {
    panel = createPanel(els.main);
    panel.id = 'topsites';
    panel.firstElementChild!.textContent = chrome.i18n.getMessage('top_sites_panel');
  }
  updateTopSites();
  if (panel.classList.contains('folded')) panel.classList.toggle('folded');
  let e = panel.parentElement;
  while (e && e !== els.main) {
    if (e.classList.contains('folded')) e.classList.toggle('folded');
    e = e.parentElement;
  }
  panel.scrollIntoView({ behavior: 'smooth' });
  flash(panel as HTMLElement, 'highlight');
}

function updateTopSites() {
  const panel = els.main.querySelector('#topsites');
  if (!panel) return;
  const sites = panel.querySelectorAll('a');
  for (const link of sites) {
    panel.lastElementChild?.removeChild(link);
  }
  chrome.topSites.get((data) => {
    for (const link of data) {
      const a = createExampleLink(link.title, link.url);
      panel.lastElementChild?.append(a);
    }
  });
}

function toogleBookmarksPanel() {
  let panel = els.main.querySelector('#bookmarksPanel');
  if (!panel) {
    panel = createPanel(els.main);
    panel.id = 'bookmarksPanel';
    panel.firstElementChild!.textContent = chrome.i18n.getMessage('bookmarks');
  }
  for (const children of panel.lastElementChild!.children) {
    panel.lastElementChild!.removeChild(children);
  }
  updateBookmarksPanel();
  if (panel.classList.contains('folded')) panel.classList.toggle('folded');
  let e = panel.parentElement;
  while (e && e !== els.main) {
    if (e.classList.contains('folded')) e.classList.toggle('folded');
    e = e.parentElement;
  }
  panel.scrollIntoView({ behavior: 'smooth' });
  flash(panel as HTMLElement, 'highlight');
}

async function updateBookmarksPanel() {
  const rootPanel = els.main.querySelector('#bookmarksPanel') as HTMLElement;
  if (!rootPanel) return;
  const tree = await new Promise<chrome.bookmarks.BookmarkTreeNode[]>(resolve => {
    chrome.bookmarks.getTree(resolve);
  });
  inDepthBookmarkTree(tree[0], rootPanel);
}

function inDepthBookmarkTree(toTreat: chrome.bookmarks.BookmarkTreeNode, parentPanel: HTMLElement) {
  if (toTreat.children) {
    const panel = createPanel(els.main);
    parentPanel.lastElementChild!.append(panel);
    panel.firstElementChild!.textContent = toTreat.title;
    for (const a of toTreat.children) {
      inDepthBookmarkTree(a, panel);
    }
  } else {
    parentPanel.lastElementChild!.append(createExampleLink(toTreat.title, toTreat.url));
  }
}

function addAgenda() {
  const panel = createPanel(els.main, false);
  panel.id = 'agenda-' + String(OPTS.agendas.length);
  panel.firstElementChild!.textContent = chrome.i18n.getMessage('agenda');
  OPTS.agendas.push(
    {
      agendaUrl: chrome.i18n.getMessage('default_agenda_link'),
      events: [],
    },
  );
  options.write();
  updateAgenda();
}

async function updateAgenda() {
  for (let index = 0; index < OPTS.agendas.length; index++) {
    const agenda = OPTS.agendas[index];
    if (!agenda.agendaUrl || agenda.agendaUrl === chrome.i18n.getMessage('default_agenda_link')) return;
    if (agenda.events.length === 0) {
      await updateAgendaBackground();
    }
    displayNewAgenda(index, agenda);
  }
}

function displayNewAgenda(index:number, agenda:types.Agenda) {
  const rootPanel = els.main.querySelector('#agenda-' + String(index)) as HTMLElement;
  if (!rootPanel) return;
  while (rootPanel.lastElementChild!.firstChild) {
    rootPanel.lastElementChild!.removeChild(rootPanel.lastElementChild!.lastChild!);
  }
  for (const event of agenda.events.slice(0, OPTS.agendaNb)) {
    const panel = createPanel(rootPanel.lastElementChild as HTMLElement);
    panel.firstElementChild!.textContent = (event.location) ? event.title + ' - ' + event.location : event.title;
    const p = document.createElement('p');
    if (event.startDate.includes('Invalid') || event.endDate.includes('Invalid')) console.error('Invalid Date : ' + event.title);
    else {
      p.textContent = chrome.i18n.getMessage('start') + ': ' + event.startDate;
      if (OPTS.showEndDateAgenda) p.textContent += ' | ' + chrome.i18n.getMessage('end') + ': ' + event.endDate;
    }
    panel.lastElementChild?.append(p);
  }
}

function duplicatePanel(keepLinks: boolean) {
  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }
  const section = els.contextClicked;
  if (!section || section === els.main) return;
  const dupe = section.cloneNode(true) as HTMLElement;
  if (!keepLinks) {
    const elements = dupe.querySelectorAll('a');
    for (const e of elements) {
      e.parentNode?.removeChild(e);
    }
  }
  dupe.firstElementChild!.innerHTML = chrome.i18n.getMessage('copy') + dupe.firstElementChild!.innerHTML;
  section.after(dupe);
  dupe.scrollIntoView({ behavior: 'smooth' });
  flash(dupe, 'highlight');
  dupe.addEventListener('contextmenu', saveElmContextClicked);
  toast.html('locked', chrome.i18n.getMessage('duplicate_panel'));
}

/**
 * Accept an array of things that are either containers or links
 * inject in the section template
 * use the name
 * stick in the links
 * iff link has links - recurse
 * iff link has no links - inject
 */
export function buildBookmarks(OPTS:types.Options, data:chrome.bookmarks.BookmarkTreeNode[], target:HTMLElement, count:number) :void {
  target.textContent = '';
  for (const x of data) {
    if (count === 0) break;

    if (!x.url) continue; // skip folders

    const indoc = OPTS.hideBookmarksInPage && document.querySelector(`[href="${x.url}"]`);
    if (indoc || (x.dateAdded && x.dateAdded < Date.now() - twoWeeks)) {
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
    case 'SECTION': result = elem.children[1]; break;
    case 'H1': result = elem.nextElementSibling; break;
    case 'NAV': result = elem; break;
    case 'A': result = elem.parentElement; break;
    case 'MAIN': result = elem; break;
    case 'IMG': result = elem.parentElement?.parentElement; break;
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
function findParentWithFlex(elem:HTMLElement):HTMLElement {
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
  if (!dragging || dragging.el === tgt) return; // can't drop on self

  const nav = findNav(tgt);
  const position = tgt === dragging.el.nextElementSibling ? 'afterend' : 'beforebegin';

  if (dragging.el.tagName === 'A') {
    if (tgt.tagName === 'H1') return nav.prepend(dragging.el);
    if (tgt.tagName === 'A') return tgt.insertAdjacentElement(position, dragging.el);
    if (nav.children.length === 0) return nav.prepend(dragging.el);
  }

  if (dragging.el.tagName === 'SECTION') {
    if (dragging.el.contains(tgt)) return; // can't drop *inside* self
    // if (nav.parentElement === dragging) return; // can't drop *inside* self
    // dropping on a heading inserted before that heading's parent
    if (tgt.tagName === 'H1') {
      const beforeOrAfter = calculatePositionWithinTarget(e);
      return tgt.parentElement!.insertAdjacentElement(beforeOrAfter, dragging.el);
    }

    if (tgt.tagName === 'A') return tgt.insertAdjacentElement(position, dragging.el);
    if (tgt.tagName === 'MAIN') return nav.append(dragging.el);

    if (nav.children.length === 0) return nav.prepend(dragging.el);
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
  if (!dragging || !dragging.parent) return;

  if (dragging.sibling) {
    dragging.parent.insertBefore(dragging.el, dragging.sibling);
  } else {
    dragging.parent.append(dragging.el);
  }
}

function dragEnter() {
  if (!dragging) {
    dragging = {
      el: createExampleLink('💧'),
    };
  }
  dragging.el.classList.add('dragging');
}

/* respond when a drag begins */
function dragStart(e:DragEvent) {
  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }
  els.body.classList.add('dragOngoing');
  if (els.body.classList.contains('editing')) return;

  const target = e.target! as HTMLElement;

  let el, dummy;
  if (target.classList.contains('new')) {
    if (target.id === 'addlink') {
      dummy = createExampleLink();
      dummy.classList.add('dragging');
      dummy.classList.add('new');
      el = dummy;
      toast.html('addlink', chrome.i18n.getMessage('add_link'));
    } else {
      // addpanel
      dummy = createPanel(els.main);
      dummy.classList.add('dragging');
      dummy.classList.add('new');
      el = dummy;
      toast.html('addpanel', chrome.i18n.getMessage('add_panel'));
    }
  } else {
    el = target;
    el.classList.add('dragging');
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.dropEffect = 'move';
    toast.html('moving', chrome.i18n.getMessage('moving'));
  }

  dragging = {
    el,
    dummy,
    parent: target.parentElement,
    sibling: target.nextElementSibling,
    startedOnThisPage: true,
  };

  // setDragImage(e);  // <-- not sure I like disabling this or if I want it as an option
}

function flash(elem:HTMLElement, cls = 'flash') {
  elem.classList.add(cls);
  elem.addEventListener('animationend', () => { elem.classList.remove(cls); });
}

// function setDragImage(e) {
//   const img = new Image();
//   img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
//   e.dataTransfer.setDragImage(img, 1, 1);
// }

/* respond if dropping here is ok */
function dragOver(e:DragEvent) {
  if (!dragging) return;

  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }

  const target = e.target! as HTMLElement;

  if (!dragging.dummy && target === els.bin) {
    els.bin.classList.add('over');
  } else {
    els.bin.classList.remove('over');
  }

  if (checkDragIsWithin(target, els.main)) {
    e.preventDefault();
    if (!els.toolbar.contains(target)) {
      moveElement(e);
    }
  } else {
    // when outside the drop zone, temporary moves are undone,
    // real dragged element returns to its original spot
    // and dummy drag element is added to main so it's visible
    if (dragging.parent === els.toolbarnav) {
      els.main.append(dragging.el);
    } else {
      replaceElementInOriginalPosition();
    }
    if (e.target === els.bin) { // gotta allow bin drops too
      e.preventDefault();
      tooltip.reposition(e, 'Drop trash here.');
    }
  }
  prepareDynamicFlex(els.main);
}

function extractDataFromDrop(e:DragEvent) {
  if (!dragging || !(dragging.el instanceof HTMLAnchorElement)) return;

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
      toast.html('notlink', chrome.i18n.getMessage('not_link'));
    }
  }

  if (url) {
    dragging.el.href = url;
    setFavicon(dragging.el, url);
    dragging.el.textContent = text || '';
  } else {
    dragging.el.remove();
  }
}

function dragDrop(e: DragEvent) {
  if (!dragging) return;

  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }

  let target:HTMLElement|null = e.target as HTMLElement;
  while (target && target !== els.main) {
    if (target.id.includes('agenda') || target.id.includes('topsites') || target.id.includes('bookmarksPanel')) {
      toast.html('impossible', chrome.i18n.getMessage('impossible_drop'));
      return;
    }
    target = target.parentElement;
  }

  e.preventDefault();
  dragging.el.classList.remove('dragging');
  dragging.el.classList.remove('fresh');
  if (e.target === els.bin && !dragging.dummy) {
    els.trash = els.main.querySelector('#trash') || util.cloneTemplateToTarget('#template_trash', els.main);
    els.trash.lastElementChild?.append(dragging.el);
    saveChanges();
    toast.html('locked', chrome.i18n.getMessage('locked_moved_to_trash'));
  } else {
    if (!dragging.startedOnThisPage) {
      extractDataFromDrop(e);
    }
    // handle all cases
    saveChanges();
  }
}


function dragEnd() {
  if (!dragging) return;

  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }

  els.body.classList.remove('dragOngoing');
  els.bin.classList.remove('over');

  dragging.el.classList.remove('dragging');
  dragging.el.classList.remove('fresh');
  // event must have been cancelled because `dragging` should be reset on drop

  if (dragging.el.classList.contains('new')) {
    const elem = document.querySelector('.new') as HTMLElement;
    if (OPTS.editOnNewDrop) editStart(elem);
    elem.classList.remove('new');
  }

  if (dragging.dummy) {
    dragging.dummy.remove();
  } else {
    replaceElementInOriginalPosition();
  }

  dragging = undefined;

  tooltip.hide();
  toast.html('cancel', chrome.i18n.getMessage('drag_cancel'));
}

export async function prepareBookmarks(OPTS:types.Options, target:HTMLElement) :Promise<void> {
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
  const elems = document.querySelectorAll<HTMLElement>(selectors);
  elems.forEach(e => {
    el[e.id ? e.id : e.tagName.toLowerCase()] = e;
  });
  return el;
}


function findParentSection(elem?:Element) {
  if (!elem) return null;
  return elem.tagName === 'SECTION' ? elem : elem.parentElement;
}

function toggleFold(e:Event) {
  if (!OPTS.allowCollapsingLocked) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }
  if (!(e.target instanceof HTMLElement)) return;
  if (els.body.classList.contains('editing')) return;
  const foldMe = findParentSection(e.target);
  if (foldMe === els.trash) {
    toast.html('locked', chrome.i18n.getMessage('locked_trash_hidden'));
    toggleTrash();
    saveChanges();
    return;
  }
  if (foldMe?.tagName === 'SECTION') {
    foldMe.classList.toggle('folded');
    if (OPTS.savePanelStatusLocked) saveChanges();
  }
  prepareDynamicFlex(els.main);
}

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

function prepareListeners() {
  const anchors = document.querySelectorAll('a');
  for (const a of anchors) {
    addAnchorListeners(a);
  }
  document.addEventListener('keydown', detectKeydown);

  els.addlink.addEventListener('click', addLinkListener);
  els.addpanel.addEventListener('click', addPanel);
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
  els.trash = els.main.querySelector('#trash') || util.cloneTemplateToTarget('#template_trash', els.main);
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

// interface PregnantHTMLElement extends HTMLDialogElement {
//   lastElementChild:HTMLElement,
//   firstElementChild:HTMLElement
// }

function cloneToDialog(selector:string) {
  dialog = document.createElement('dialog');
  dialog.id = 'dialog';
  document.body.append(dialog);

  const template = document.querySelector(selector);

  if (!(template instanceof HTMLTemplateElement)) {
    throw new Error('Failed to clone. Selector ' + selector + ' in dialog must point to a template.');
  }

  util.localizeHtml(template.content);
  const clone = document.importNode(template.content, true);

  if (!clone) {
    throw new Error('Failed to clone ' + selector + ' in dialog.  Template needs children to continue.  Sad.');
  }

  clearDialog();
  dialog.append(clone);
}

function prepareTrash() {
  els.trash = els.trash || document.querySelector('#trash');
  if (!els.trash) {
    els.trash = util.cloneTemplateToTarget('#template_trash', els.main);
    els.trash.id = 'trash';
  }
  els.trash.classList.add('invisible');
  els.bin.addEventListener('click', toggleTrash);
}

/*
 * make all links within a doc draggable
 */
export function prepareDrag() :void {
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
  if (nav) {
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

function lock() {
  OPTS.lock = !OPTS.lock;
  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('lock_on'));
  } else {
    toast.html('locked', chrome.i18n.getMessage('lock_off'));
  }
}

function togglePresentation() {
  const panels = document.querySelectorAll('.private');
  els.main.classList.toggle('private-on');
  if (els.main.classList.contains('private-on')) {
    for (const p of panels) {
      p.classList.add('blur');
    }
  } else {
    for (const p of panels) {
      p.classList.remove('blur');
    }
  }
}

function receiveBackgroundMessages(m:{item:string}) {
  switch (m.item) {
    case 'emptytrash': emptyTrash(); break;
    case 'togglebookmarks': toggleBookmarks(); break;
    case 'addAgenda': addAgenda(); break;
    case 'toggle-sidebar': toggleBookmarks(); break;
    case 'toggle-heatmap': toggleHeatMap(); break;
    case 'toggle-presentation': togglePresentation(); break;
    case 'withoutLink': duplicatePanel(false); break;
    case 'withLink': duplicatePanel(true); break;
    case 'topsitespanel': addTopSitesPanel(); break;
    case 'bookmarkspanel': toogleBookmarksPanel(); break;
    case 'addLink' : addLink(els.contextClicked); break;
    case 'addPanel' : createPanel(els.contextClicked, true, false); break;
    case 'lock' : lock(); break;
    case 'option' : util.simulateClick('#options'); break;
    default: break;
  }
}

function saveElmContextClicked(e: Event) {
  e.stopPropagation();
  const target = findParentSection(e.target! as HTMLElement);
  if (target !== null && target.tagName === 'SECTION') {
    els.contextClicked = target as HTMLElement;
  } else {
    els.contextClicked = els.main;
  }
}

function prepareBackgroundListener() {
  chrome.runtime.onMessage.addListener(receiveBackgroundMessages);
}

function prepareMain(OPTS:types.Options) {
  prepareContent(OPTS.html);
  prepareDrag();
  prepareFoldables();
  prepareDynamicFlex(els.main);
  prepareContextPanelEventListener();
}

function prepareContextPanelEventListener() {
  const sections = els.main.querySelectorAll('section');
  for (const s of sections) {
    s.addEventListener('contextmenu', saveElmContextClicked);
  }
  els.main.addEventListener('contextmenu', saveElmContextClicked);
}

/** Migration **/
function migrateLinks() {
  /* pre 1.6 used data-href */
  for (const o of els.main.querySelectorAll<HTMLAnchorElement>('a[data-href]')) {
    o.href = o.dataset.href!;
    delete o.dataset.href;
  }

  /* anchors are draggable anyway and should not have the attr set
   * this was erroneously done before 1.6 */
  for (const o of els.main.querySelectorAll('a[draggable]')) {
    o.removeAttribute('draggable');
  }

  /* Ensure no highlights are hanging around there's a small
   * chance they can be saved before they timeout */
  for (const o of els.main.querySelectorAll('.highlight')) {
    o.classList.remove('highlight');
  }

  /* Ensure no hangover locales in headings that result in panels
   * that allow a change of name then change back on next load */
  for (const o of els.main.querySelectorAll<HTMLElement>('[data-locale]')) {
    delete o.dataset.locale;
  }
}

async function prepareAll() {
  await options.load();
  els = prepareElements('[id], body, main, footer, #trash, #toolbar, #toast');
  prepareBookmarks(OPTS, els.bookmarksnav);
  util.prepareCSSVariables(OPTS);
  prepareMain(OPTS);
  prepareTrash();
  prepareBackgroundListener();
  toast.prepare();
  toast.popup(`Structured Start Tab v${chrome.runtime.getManifest().version}`);
  toast.popup(chrome.i18n.getMessage('popup_toggle_sidebar'));
  tooltip.prepare(OPTS);
  migrateLinks();
  updateTopSites();
  updateBookmarksPanel();
  updateAgenda();
  util.localizeHtml(document);
}

window.addEventListener('DOMContentLoaded', prepareAll);
