import * as util from './lib/util.js';
import * as options from './lib/options.js';
import * as toast from './lib/toast.js';
import * as tooltip from './lib/tooltip.js';
import { OPTS } from './lib/options.js';
import { updateAgendaBackground } from './background.js';
import { domToJson, jsonToDom } from './services/parser.service.js';
import { prepareDrag } from './services/drag.service.js';
import { getPageCloud, syncPageCloud } from './services/cloud.service.js';

// TODO: import all components from a common file?
import './components/agenda-item/index.js';
import './components/panel/index.js';

const oneDay = 1000 * 60 * 60 * 24;
const fourDays = oneDay * 4;
const twoWeeks = oneDay * 14;
let dialog;
let els;

function setValue(where, what, open = false) {
  const elem = document.querySelector(where);
  elem.value = what ?? '';
  if (open) { elem.dataset.open = 'true'; }
}

function getValue(where) {
  return document.querySelector(where).value;
}

function setColorValue(where, what) {
  const elem = document.querySelector(where);
  if (what[0] === '!') {
    elem.value = what.slice(1);
    elem.open = false;
  } else {
    elem.value = what;
    elem.open = true;
  }
}

function getColorValue(where) {
  const elem = document.querySelector(where);
  const color = elem.value;
  const open = elem.open ? '' : '!';
  return open + color;
}

function linkClicked(e) {
  if (e.target instanceof HTMLElement && e.target.tagName === 'A') {
    if (e.shiftKey) {
      e.preventDefault();
      editStart(e.target);
    } else if (!e.target.id) {
      updateClickCount(e.target);
    }
  }
}

function updateClickCount(a) {
  const link = a.getAttribute('href');
  if (!link) { return; }
  if (OPTS.linkStats[link]) {
    OPTS.linkStats[link]++;
  } else {
    OPTS.linkStats[link] = 1;
  }
  options.write();
}

function toHex(x, scale = 1) {
  // We need to scale the value to 0-255
  x = Math.round(x * scale);
  if (isNaN(x)) { return '00'; }
  return x.toString(16).padStart(2, '0');
}

function translateColor(rgba) {
  const parts = rgba.split('(')[1].split(')')[0].split(',');
  const converted = [
    toHex(Number(parts[0])),
    toHex(Number(parts[1])),
    toHex(Number(parts[2])),
    toHex(Number(parts[3] || '255'), 255),
  ];
  let result = '#' + converted.join('');
  if (result.includes('#ffffff')) result = '!' + result;

  return result;
}

export function editStart(elem) {
  els.edit.textContent = ''; // reset
  const style = window.getComputedStyle(elem);

  let bgcol = elem.dataset.bg ? elem.dataset.bg : translateColor(style.backgroundColor);
  let fgcol = elem.dataset.fg ? elem.dataset.fg : translateColor(style.color);

  if (elem instanceof HTMLAnchorElement) {
    cloneToDialog('#template_edit_link');
    setValue('#editname', elem.textContent);
    setValue('#editurl', elem.href);
    document.querySelector('#editname').select();
  } else {
    if (elem.tagName === 'SECTION' || elem.tagName === 'SST-PANEL') {
      if (elem.id.includes('agenda')) {
        cloneToDialog('#template_edit_panel_agenda');
        const index = parseInt(elem.id.split('-')[1]);
        setValue('#urlInput', OPTS.agendas[index]?.agendaUrl);
        setValue('#emailInput', OPTS.agendas[index]?.email);
      } else {
        cloneToDialog('#template_edit_panel');
      }

      if (elem.tagName === 'SECTION') { // Legacy support
        setValue('#editname', elem.firstElementChild.textContent);
        if (elem.classList.contains('vertical')) {
          document.querySelector('#radioVertical').checked = true;
        }
        if (elem.classList.contains('private')) {
          document.querySelector('#privateInput').checked = true;
        }
        if (elem.classList.contains('flex-disabled')) {
          document.querySelector('#flexInput').checked = true;
        }
      } else {
        setValue('#editname', elem.header);
        document.querySelector('#radioVertical').checked = elem.direction === 'vertical';
        document.querySelector('#privateInput').checked = elem.private;
        document.querySelector('#flexInput').checked = elem.singleLineDisplay;

        bgcol = elem.backgroundColour;
        fgcol = elem.textColour;
      }
    } else {
      return;
    }
  }

  setColorValue('#bgcol', bgcol);
  setColorValue('#fgcol', fgcol);

  dialog.addEventListener('close', closeDialog);
  dialog.addEventListener('cancel', editCancel);
  dialog.showModal();
  els.editing = elem;
  elem.classList.add('edited');
  document.querySelector('#editok').addEventListener('click', editOk);
  document.querySelector('#editcancel').addEventListener('click', editCancel);
  els.editname = document.querySelector('#editname');
}

function editCancel() {
  toast.html('editcancelled', chrome.i18n.getMessage('edit_cancelled'));
  closeDialog();
}

function closeDialog() {
  dialog.close();
  dialog.remove();
  if (els.editing) {
    els.editing.classList.remove('edited');
    flash(els.editing);
  }
  delete els.editing;
}

function prepareFavicons() {
  const links = els.main.querySelectorAll('a');
  for (const a of links) {
    util.setFavicon(a, a.href);
  }
}

const createStyleString = (n, v) => v[0] === '!' ? '' : `${n}:${v};`;
function addRemoveClassList(toCheck, toAdd, toRemove) {
  if (document.querySelector(toCheck).checked) {
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
    util.setFavicon(els.editing, getValue('#editurl'));
  } else {
    if (els.editing.tagName === 'SECTION') { // Legacy support
      els.editing.firstElementChild.textContent = getValue('#editname');
      if (document.querySelector('#flexInput').checked) {
        els.editing.classList.add('flex-disabled');
      } else {
        els.editing.classList.remove('flex-disabled');
      }
      addRemoveClassList('#radioVertical', ['vertical'], ['vertical']);
      addRemoveClassList('#privateInput', ['private'], ['private', 'blur']);
      if (els.editing.id.includes('agenda')) {
        let index = parseInt(els.editing.id.split('-')[1]);

        if (OPTS.agendas.length === 0) {
          OPTS.agendas = [{}];
          index = 0;
        }

        OPTS.agendas[index].agendaUrl = getValue('#urlInput');
        OPTS.agendas[index].email = getValue('#emailInput');
        options.write();
        updateAgendaBackground(OPTS.agendas[index], index)
          .then(() => displayNewAgenda(index, OPTS.agendas[index]));
      }
    } else if (els.editing.tagName === 'SST-PANEL') {
      els.editing.header = getValue('#editname');
      els.editing.singleLineDisplay = document.querySelector('#flexInput').checked;
      els.editing.direction = document.querySelector('#radioVertical').checked ? 'vertical' : 'horizontal';
      els.editing.private = document.querySelector('#privateInput').checked;

      els.editing.backgroundColour = getColorValue('#bgcol');
      els.editing.textColour = getColorValue('#fgcol');

      if (els.editing.id.includes('agenda')) {
        const index = parseInt(els.editing.id.split('-')[1]);
        OPTS.agendas[index].agendaUrl = getValue('#urlInput');
        OPTS.agendas[index].email = getValue('#emailInput');
        options.write();
        updateAgendaBackground(OPTS.agendas[index], index)
          .then(() => displayNewAgenda(index, OPTS.agendas[index]));
      }

      dialog.close();
      saveChanges();
      flash(els.editing);
      els.editing.classList.remove('edited');
      return;
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

  dialog.close();
  saveChanges();
  flash(els.editing);
  els.editing.classList.remove('edited');
  delete els.editing;
}

export function saveChanges(makeBackup = true) {
  if (els.main == null) return;

  if (els.main.classList.contains('heatmap')) {
    toggleHeatMap();
  }
  if (makeBackup) {
    OPTS.jsonBackup = [...OPTS.json];
  }

  OPTS.json = domToJson(els.main);
  options.write();

  prepareListeners();

  util.prepareCSSVariables(OPTS);
  util.prepareDynamicFlex(els.main);
  prepareBookmarks(OPTS, els.bookmarksnav);
}

function detectKeydown(e) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    util.simulateClick('#editok');
  }
  if (e.code === 'KeyZ' && (e.metaKey || e.ctrlKey)) {
    if (OPTS.jsonBackup) {
      const copy = [...OPTS.json];
      OPTS.json = [...OPTS.jsonBackup];
      OPTS.jsonBackup = copy;
    }
    options.write();
    prepareContent();
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
  const numbers = [];
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
    els.bookmarks.querySelector('h1').textContent = chrome.i18n.getMessage('heatmap_legend');
    util.cloneTemplateToTarget('#heatmap_legend', els.bookmarksnav);
  } else {
    els.bookmarks.querySelector('h1').textContent = chrome.i18n.getMessage('bookmarks');
    prepareBookmarks(OPTS, els.bookmarksnav);
  }
}

function getColorHeatMap(value, max) {
  const h = (1.0 - (value / max)) * 240;
  return 'hsl(' + String(h) + ', 100%, 50%)';
}

function addLinkListener() {
  addLink();
}

function addLink(target) {
  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }
  const a = util.createExampleLink();
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

function addPanel() {
  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }
  return util.createPanel(els.main);
}

function addTopSitesPanel() {
  let panel = els.main.querySelector('#topsites');
  if (!panel) {
    panel = util.createPanel(els.main);
    panel.id = 'topsites';
    panel.firstElementChild.textContent = chrome.i18n.getMessage('top_sites_panel');
  }
  updateTopSites();
  if (panel.classList.contains('folded')) { panel.classList.toggle('folded'); }
  let e = panel.parentElement;
  while (e && e !== els.main) {
    if (e.classList.contains('folded')) { e.classList.toggle('folded'); }
    e = e.parentElement;
  }
  panel.scrollIntoView({ behavior: 'smooth' });
  flash(panel, 'highlight');
}

function updateTopSites() {
  const panel = els.main.querySelector('#topsites');
  if (!panel) { return; }
  const sites = panel.querySelectorAll('a');
  for (const link of sites) {
    panel.lastElementChild?.removeChild(link);
  }
  chrome.topSites.get((data) => {
    for (const link of data) {
      const a = util.createExampleLink(link.title, link.url);
      panel.lastElementChild?.append(a);
    }
  });
}

function toogleBookmarksPanel() {
  let panel = els.main.querySelector('#bookmarksPanel');
  if (!panel) {
    panel = util.createPanel(els.main);
    panel.id = 'bookmarksPanel';
    panel.firstElementChild.textContent = chrome.i18n.getMessage('bookmarks');
  }
  for (const children of panel.lastElementChild.children) {
    panel.lastElementChild.removeChild(children);
  }
  updateBookmarksPanel();
  if (panel.classList.contains('folded')) { panel.classList.toggle('folded'); }
  let e = panel.parentElement;
  while (e && e !== els.main) {
    if (e.classList.contains('folded')) { e.classList.toggle('folded'); }
    e = e.parentElement;
  }
  panel.scrollIntoView({ behavior: 'smooth' });
  flash(panel, 'highlight');
}

async function updateBookmarksPanel() {
  const rootPanel = els.main.querySelector('#bookmarksPanel');
  if (!rootPanel) { return; }
  const tree = await new Promise(resolve => {
    chrome.bookmarks.getTree(resolve);
  });
  inDepthBookmarkTree(tree[0], rootPanel);
}

function inDepthBookmarkTree(toTreat, parentPanel) {
  if (toTreat.children) {
    const panel = util.createPanel(els.main);
    parentPanel.lastElementChild.append(panel);
    panel.firstElementChild.textContent = toTreat.title;
    for (const a of toTreat.children) {
      inDepthBookmarkTree(a, panel);
    }
  } else {
    parentPanel.lastElementChild.append(util.createExampleLink(toTreat.title, toTreat.url));
  }
}

function addAgenda() {
  const panel = util.createPanel(els.main, false);
  panel.id = 'agenda-' + String(OPTS.agendas.length);
  panel.header = chrome.i18n.getMessage('agenda');
  panel.direction = 'vertical';
  OPTS.agendas.push({
    agendaUrl: chrome.i18n.getMessage('default_agenda_link'),
    events: [],
    email: '',
  });
  options.write();
  updateAgenda();
}

async function updateAgenda(updateAgendas = true) {
  for (let index = 0; index < OPTS.agendas.length; index++) {
    const agenda = OPTS.agendas[index];
    if (!agenda.agendaUrl || agenda.agendaUrl === chrome.i18n.getMessage('default_agenda_link')) { continue; }
    if (agenda.events.length === 0 && updateAgendas) {
      await updateAgendaBackground(agenda, index);
    }
    displayNewAgenda(index, agenda);
  }
}

function displayNewAgenda(index, agenda) {
  const rootPanel = getAllBySelector(els.main, '#agenda-' + String(index))[0]?._panel;
  if (!rootPanel) { return; }
  while (rootPanel.lastElementChild.firstChild) {
    rootPanel.lastElementChild.removeChild(rootPanel.lastElementChild.lastChild);
  }
  for (const event of agenda.events.slice(0, OPTS.agendaNb)) {
    const agendaItem = document.createElement('agenda-item');
    agendaItem.setAttribute('time', event.utcDate);
    agendaItem.setAttribute('title', event.title);
    agendaItem.setAttribute('href', event.url);
    rootPanel.querySelector('nav').append(agendaItem);
  }
}

function duplicatePanel(keepLinks) {
  if (OPTS.lock) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }
  const section = els.contextClicked;
  if (!section || section === els.main) { return; }
  const dupe = section.cloneNode(true);
  if (!keepLinks) {
    const elements = dupe.querySelectorAll('a');
    for (const e of elements) {
      e.parentNode?.removeChild(e);
    }
  }
  dupe.firstElementChild.innerHTML = chrome.i18n.getMessage('copy') + dupe.firstElementChild.innerHTML;
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
export function buildBookmarks(OPTS, data, target, count) {
  target.textContent = '';
  for (const x of data) {
    if (count === 0) { break; }
    if (!x.url) { continue; } // skip folders
    const indoc = OPTS.hideBookmarksInPage && document.querySelector(`[href="${x.url}"]`);
    if (indoc || (x.dateAdded && x.dateAdded < Date.now() - twoWeeks)) {
      // bookmark is already in doc, or its older
      // than three weeks, so skip it.
      // TODO make this an option?
    } else {
      count--;
      const a = util.createExampleLink(x.title, x.url);
      a.id = window.btoa(String(Date.now() * Math.random())).slice(-8).toLowerCase();
      if (x.dateAdded && x.dateAdded > Date.now() - fourDays) {
        a.classList.add('fresh');
      }
      target.append(a);
    }
  }
}


function flash(elem, cls = 'flash') {
  elem.classList.add(cls);
  elem.addEventListener('animationend', () => { elem.classList.remove(cls); });
}

export async function prepareBookmarks(OPTS, target) {
  if (OPTS.showBookmarksSidebar) {
    const count = OPTS.showBookmarksLimit;
    const bp = new Promise(resolve => {
      chrome.bookmarks.getRecent(20 + count, resolve);
    });
    buildBookmarks(OPTS, await bp, target, count);
  }
  showBookmarks(OPTS.showBookmarksSidebar);
  document.querySelector('#sidebar').style.setProperty('visibility', 'visible');
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

function findEventFirstSection(e) {
  const path = e.path || (e.composedPath && e.composedPath());
  for (let i = 0; i < path.length; i++) {
    if (path[i].tagName === 'SECTION') {
      return path[i];
    }
  }

  return null;
}

function findSection(elem) {
  if (!elem) { return null; }
  if (elem.tagName === 'SECTION') return elem; // Legacy support
  if (elem.tagName === 'SST-PANEL') return elem.shadowRoot.children[0];
  return elem.parentElement;
}

function toggleFold(e) {
  if (!OPTS.allowCollapsingLocked) {
    toast.html('locked', chrome.i18n.getMessage('locked'));
    return;
  }

  // This is why shadow root needs to be open
  const target = util.findTarget(e);

  if (!(target instanceof HTMLElement)) { return; }
  if (els.body.classList.contains('editing')) { return; }
  const foldMe = findSection(target);
  if (foldMe === els.trash) {
    toast.html('locked', chrome.i18n.getMessage('locked_trash_hidden'));
    toggleTrash();

    return;
  }
  if (foldMe?.tagName === 'SECTION') {
    foldMe.classList.toggle('folded');
    target?.toggleFold?.();
  }

  if (els.main != null) { util.prepareDynamicFlex(els.main); }

  saveChanges();
}

function editSection(e) {
  if (!e.shiftKey) return;

  const target = util.findTarget(e);
  if (target.tagName === 'A') {
    return;
  }

  if (els.body.classList.contains('editing')) { return; }

  const elementToEdit = findEventFirstSection(e);

  if (els.main == null) return;

  if (elementToEdit.id.includes('agenda')) {
    editStart(elementToEdit);
  } else if (target.tagName === 'SST-PANEL' && target.shadow?.contains(elementToEdit)) {
    editStart(target);
  } else if (elementToEdit instanceof HTMLElement && elementToEdit?.tagName === 'SECTION') { // Legacy support
    editStart(elementToEdit);
  }
}

/** add a fold button to the page if necessary */
export function prepareFoldables(selectors = 'main') {
  const elems = [...document.querySelectorAll(selectors)];
  elems.forEach(e => e.addEventListener('dblclick', toggleFold));
  elems.forEach(e => e.addEventListener('click', editSection));
}

function getAllBySelector(element, selector) {
  const elements = [...element.querySelectorAll(selector)];
  for (const child of element.children) {
    elements.push(...getAllBySelector(child, selector));
  }
  if (element.shadowRoot) {
    elements.push(...getAllBySelector(element.shadowRoot, selector));
  }
  return elements;
}

function prepareListeners() {
  const anchors = getAllBySelector(els.main, 'a');
  for (const a of anchors) {
    util.addAnchorListeners(a, linkClicked);
  }
  document.addEventListener('keydown', detectKeydown);
  els.addlink.addEventListener('click', addLinkListener);
  els.addpanel.addEventListener('click', addPanel);
}

function prepareContent() {
  // clean page
  while (els.main.firstElementChild) {
    els.main.firstElementChild.remove();
  }

  // If we don't have a JSON backup yet but we have an html property, it means that we are transitioning from the old version of storing
  if (OPTS.jsonBackup == null && OPTS.html != null) {
    const parser = new DOMParser();
    const tempdoc = parser.parseFromString(OPTS.html, 'text/html');
    const topLevel = tempdoc.querySelectorAll('body>*');

    // populate page
    for (const elem of topLevel) {
      els.main.append(elem);
    }
    prepareFavicons();
  } else {
    jsonToDom(els.main, OPTS.json);
    updateAgenda(false);
  }

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

function cloneToDialog(selector) {
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

function emptyTrash() {
  delete els.trash;
  document.querySelector('#trash')?.remove();
  prepareTrash();
  saveChanges();
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
  const panels = getAllBySelector(els.main, '[private]');

  els.main.classList.toggle('private-on');
  const isPrivateOn = els.main.classList.contains('private-on');
  for (const panel of panels) {
    panel.blur = isPrivateOn;
  }
}

function receiveBackgroundMessages(m) {
  switch (m.item) {
    case 'emptytrash':
      emptyTrash();
      break;
    case 'togglebookmarks':
      toggleBookmarks();
      break;
    case 'addAgenda':
      addAgenda();
      break;
    case 'toggle-sidebar':
      toggleBookmarks();
      break;
    case 'toggle-heatmap':
      toggleHeatMap();
      break;
    case 'toggle-presentation':
      togglePresentation();
      break;
    case 'withoutLink':
      duplicatePanel(false);
      break;
    case 'withLink':
      duplicatePanel(true);
      break;
    case 'topsitespanel':
      addTopSitesPanel();
      break;
    case 'bookmarkspanel':
      toogleBookmarksPanel();
      break;
    case 'addLink':
      addLink(els.contextClicked);
      break;
    case 'addPanel':
      util.createPanel(els.contextClicked, true, false);
      break;
    case 'lock':
      lock();
      break;
    case 'option':
      util.simulateClick('#options');
      break;
    default: break;
  }
}

function saveElmContextClicked(e) {
  e.stopPropagation();
  const target = findSection(e.target);
  if (target !== null && target.tagName === 'SECTION') {
    els.contextClicked = target;
  } else {
    els.contextClicked = els.main;
  }
}

function prepareBackgroundListener() {
  chrome.runtime.onMessage.addListener(receiveBackgroundMessages);
}

function prepareMain() {
  prepareContent();
  prepareDrag();
  prepareFoldables();
  util.prepareDynamicFlex(els.main);
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
  for (const o of els.main.querySelectorAll('a[data-href]')) {
    o.href = o.dataset.href;
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
  for (const o of els.main.querySelectorAll('[data-locale]')) {
    delete o.dataset.locale;
  }
}

async function loadPageCloud() {
  if (!OPTS.cloud.hasConflict) return;

  const [onlinePage, onlinePageVersion] = await getPageCloud();

  const parsedPage = JSON.parse(onlinePage);

  const isEqual = util.isContentEqual(parsedPage, OPTS.json);

  if (!isEqual) {
    OPTS.onlineJson = parsedPage;
    OPTS.onlinePageVersion = onlinePageVersion;
    saveChanges();
    document.querySelector('#mergeConflictResolver').style.display = 'block';
  } else {
    OPTS.cloud.version = onlinePageVersion + 1;
    OPTS.cloud.hasConflict = false;
    options.write();
  }
}

const prepareSectionActions = () => {
  // Merge conflict resolver trigger
  document.querySelector('#mergeConflictResolver').addEventListener('click', () => {
    window.location.href = './pages/merge-resolver/index.html';
  });

  // Feedback button should always be visible when in beta
  if (!OPTS.showFeedback && !util.isBeta()) {
    document.querySelector('#feedback').style.display = 'none';
  }

  if (!OPTS.cloud.enabled) {
    document.querySelector('#forceCloudSync').style.display = 'none';
  }

  document.querySelector('#forceCloudSync a').addEventListener('click', () => {
    syncPageCloud();
  });
};

async function prepareAll() {
  await options.load();
  els = util.prepareElements('[id], body, main, footer, #trash, #toolbar, #toast');

  if (els.main == null) return;

  prepareBookmarks(OPTS, els.bookmarksnav);
  util.prepareCSSVariables(OPTS);
  prepareMain();
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

  prepareSectionActions();

  if (OPTS.cloud.enabled) { await loadPageCloud(); }
}


window.addEventListener('DOMContentLoaded', prepareAll);
