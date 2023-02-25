// TODO: import all components from a common file?
import './components/agenda-item/index.js';
import { loadPanelDefinition } from './components/panel/index.js';
import './components/edit-window/index.js';

import * as options from './lib/options.js';
import * as toast from './lib/toast.js';
import * as tooltip from './lib/tooltip.js';
import * as util from './lib/util.js';
import * as ui from './services/ui.service.js';
import * as sync from './services/sync.service.js';

import { domToJson, jsonToDom } from './services/parser.service.js';

import { OPTS } from './lib/options.js';
import { prepareDrag } from './services/drag.service.js';
import { updateAgenda, getAgendasFromObject } from './services/agenda.service.js';
import { editPanel, editAgenda } from './services/edit.service.js';

const oneDay = 1000 * 60 * 60 * 24;
const fourDays = oneDay * 4;
const twoWeeks = oneDay * 14;
let els;

function prepareFavicons() {
  const links = els.main.querySelectorAll('a');
  for (const a of links) {
    util.setFavicon(a, a.href);
  }
}

export function saveChanges({ makeBackup = true, newChanges = false } = {}) {
  if (els.main == null) return;

  if (els.main.classList.contains('heatmap')) {
    toggleHeatMap();
  }

  if (makeBackup) OPTS.jsonBackup = [...OPTS.json];
  OPTS.sync.newChanges = OPTS.sync.newChanges || newChanges;

  OPTS.json = domToJson(els.main);
  options.write();

  prepareListeners();

  util.prepareCSSVariables(OPTS);
  util.prepareDynamicFlex(els.main);
  prepareBookmarks(OPTS, els.bookmarksnav);
}


function detectKeydown(e) {
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
    // Run same function as clicking the save button
    document.querySelectorAll('edit-window').forEach((el) => el.ok());
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
    // Remove all edit windows
    const editWindow = document.querySelector('edit-window');
    if (editWindow) {
      editWindow.remove();
      toast.html('editcancelled', chrome.i18n.getMessage('edit_cancelled'));
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
  a.draggable = true;
  toast.html('addlink', chrome.i18n.getMessage('toast_link_add'));
  ui.flash(a, 'highlight');
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
  ui.flash(panel, 'highlight');
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
  ui.flash(panel, 'highlight');
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
  // New agenda id is the highest id + 1
  panel.id = 'agenda-' + Math.max(...OPTS.agendas.map(agenda => parseInt(agenda.agendaId.split('-')[1])));
  panel.header = chrome.i18n.getMessage('agenda');
  panel.direction = 'vertical';
  OPTS.agendas.push({
    agendaUrl: chrome.i18n.getMessage('default_agenda_link'),
    events: [],
    email: '',
    agendaId: panel.id,
  });
  options.write();
  updateAgenda();
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
  ui.flash(dupe, 'highlight');
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
    const indoc = OPTS.hideBookmarksInPage && util.getAllBySelector(els.main, `[href="${x.url}"]`);
    if (indoc.length > 0 || (x.dateAdded && x.dateAdded < Date.now() - twoWeeks)) {
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

    // Only set the grid if we're showing the sidebar
    document.documentElement.style.setProperty('--main-grid-template-columns', 'calc(100vw - var(--bookmark-width)) var(--bookmark-width)');
  } else {
    document.documentElement.style.setProperty('--bookmark-width', '0em');
    document.documentElement.style.setProperty('--bookmark-margin', '0em');
    document.documentElement.style.setProperty('--bookmark-padding', '0em');
    document.documentElement.style.setProperty('--bookmark-border', '0em');
  }
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
  if (foldMe?.tagName === 'SECTION' || target?.tagName === 'SST-PANEL') {
    foldMe.classList.toggle('folded');
    target?.toggleFold?.();
  }

  if (els.main != null) { util.prepareDynamicFlex(els.main); }

  saveChanges({ newChanges: true });
}

function editSection(e) {
  if (!e.shiftKey) return;

  const target = util.findTarget(e);
  if (target.tagName === 'A') return;

  if (target.id.startsWith('agenda')) {
    editAgenda(target);
  } else { editPanel(target); }
}

/** add a fold button to the page if necessary */
export function prepareFoldables() {
  const elems = [...document.querySelectorAll('main')];
  elems.forEach(e => e.addEventListener('dblclick', toggleFold));
  elems.forEach(e => e.addEventListener('click', editSection));
}

function prepareListeners() {
  const anchors = util.getAllBySelector(els.main, 'a');
  for (const a of anchors) {
    util.addAnchorListeners(a, util.linkClicked);
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
  const panels = util.getAllBySelector(els.main, '[private]');

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

const prepareSectionActions = () => {
  // Merge conflict resolver trigger
  document.querySelector('#mergeConflictResolver').addEventListener('click', () => {
    window.location.href = './pages/merge-resolver/index.html';
  });

  // Feedback button should always be visible when in beta
  if (!OPTS.showFeedback && !util.isBeta()) {
    document.querySelector('#feedback').style.display = 'none';
  }

  if (!OPTS.sync.enabled) {
    document.querySelector('#forceStorageSync').style.display = 'none';
  }

  document.querySelector('#forceStorageSync a').addEventListener('click', () => {
    sync.syncFullContent({ window: els.main });
  });
};

function prepareAgendas() {
  const agendas = [];
  getAgendasFromObject(OPTS.json, agendas);

  // Remove agendas not in the window
  OPTS.agendas = [...OPTS.agendas.filter(agenda => agendas.includes(agenda.agendaId))];
}

async function prepareAll() {
  prepareBackgroundListener();

  await options.load();
  await loadPanelDefinition();
  els = util.prepareElements('[id], body, main, footer, #trash, #toolbar, #toast');

  if (els.main == null) return;

  prepareBookmarks(OPTS, els.bookmarksnav);
  util.prepareCSSVariables(OPTS);
  prepareMain();
  prepareTrash();
  prepareAgendas();
  toast.prepare();
  toast.popup(`Structured Start Tab v${chrome.runtime.getManifest().version}`);
  toast.popup(chrome.i18n.getMessage('popup_toggle_sidebar'));
  tooltip.prepare(OPTS);
  migrateLinks();
  updateTopSites();
  updateBookmarksPanel();
  updateAgenda(false);
  util.localizeHtml(document);

  prepareSectionActions();

  // If there's a conflict, try to re-sync the content
  if (OPTS.sync.enabled && OPTS.sync.hasConflict) { sync.syncFullContent({ window: els.main, ignoreConflict: true }); }
}


window.addEventListener('DOMContentLoaded', prepareAll);
