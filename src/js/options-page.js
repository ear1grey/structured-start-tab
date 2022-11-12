// or chrome.storage.sync
// load default option values from a file
// these defaults are replaced  thereafter if it's possible to initial values here are app defaults
import * as toast from './lib/toast.js';
import * as util from './lib/util.js';
import { OPTS } from './lib/options.js';
import * as options from './lib/options.js';
function setCheckBox(prefs, what) {
  const elem = document.getElementById(what);
  elem.checked = prefs[what];
}
function getCheckBox(what) {
  const elem = document.getElementById(what);
  OPTS[what] = elem.checked;
}
function setValue(prefs, what, defaultValue = 0) {
  const elem = document.getElementById(what);
  elem.valueAsNumber = prefs[what] || defaultValue;
}
function getValue(what) {
  const elem = document.getElementById(what);
  OPTS[what] = elem.valueAsNumber;
}
// incorporate the latest values of the page into
// the OPTS object that gets stored.
function updatePrefsWithPage() {
  getCheckBox('lock');
  getCheckBox('allowCollapsingLocked');
  getCheckBox('savePanelStatusLocked');
  getCheckBox('showBookmarksSidebar');
  getCheckBox('hideBookmarksInPage');
  getCheckBox('showToolTips');
  getCheckBox('proportionalSections');
  getCheckBox('useCustomScrollbar');
  getCheckBox('editOnNewDrop');
  getCheckBox('showLocationAgenda');
  getCheckBox('showEndDateAgenda');
  getValue('showToast');
  getValue('showBookmarksLimit');
  getValue('space');
  getValue('fontsize');
  getValue('agendaNb');
  getValue('titleAgendaNb');
}
function updatePageWithPrefs(prefs) {
  setCheckBox(prefs, 'lock');
  setCheckBox(prefs, 'allowCollapsingLocked');
  setCheckBox(prefs, 'savePanelStatusLocked');
  setCheckBox(prefs, 'showBookmarksSidebar');
  setCheckBox(prefs, 'hideBookmarksInPage');
  setCheckBox(prefs, 'showToolTips');
  setCheckBox(prefs, 'proportionalSections');
  setCheckBox(prefs, 'useCustomScrollbar');
  setCheckBox(prefs, 'editOnNewDrop');
  setCheckBox(prefs, 'showLocationAgenda');
  setCheckBox(prefs, 'showEndDateAgenda');
  setValue(prefs, 'showToast');
  setValue(prefs, 'showBookmarksLimit');
  setValue(prefs, 'space');
  setValue(prefs, 'fontsize');
  setValue(prefs, 'agendaNb');
  setValue(prefs, 'titleAgendaNb');
}
/**
 * Creates a new 'option' based on a template.
  * @param where - where to insert the option
  * @param type - which template to use
  * @param attrs - to be added to the input element (e.g. max, min)
  * @param txt - text for the label
  */
function create(where, type, attrs, txt) {
  const elem = util.cloneTemplate('#template_' + type);
  where.append(elem);
  const elemInDoc = where.lastElementChild;
  if (elemInDoc) {
    if (attrs.id) {
      elemInDoc.setAttribute('for', attrs.id);
    }
    const input = elemInDoc.querySelector('[name=input]');
    if (input) {
      for (const [attr, val] of Object.entries(attrs)) {
        input.setAttribute(attr, val);
      }
    }
    if (txt) {
      const txtElem = elemInDoc.querySelector('[name=text]');
      if (txtElem) {
        if (txt.includes('<')) {
          txtElem.innerHTML = txt;
        } else {
          txtElem.textContent = txt;
        }
      }
    }
    elemInDoc.addEventListener('input', saveOptions);
  }
  return elemInDoc;
}
function createPageWithPrefs(prefs) {
  const settings = document.querySelector('#settings');
  if (settings) {
    const layout = create(settings, 'section', {}, chrome.i18n.getMessage('layout'));
    const book = create(settings, 'section', {}, chrome.i18n.getMessage('bookmarks'));
    const feed = create(settings, 'section', {}, chrome.i18n.getMessage('messages'));
    const agenda = create(settings, 'section', {}, chrome.i18n.getMessage('agenda'));
    const configureShortcut = create(settings, 'section', {}, chrome.i18n.getMessage('configure_shortcut_title'));
    create(book, 'checkbox', { id: 'showBookmarksSidebar' }, chrome.i18n.getMessage('showBookmarksSidebar'));
    create(book, 'checkbox', { id: 'hideBookmarksInPage' }, chrome.i18n.getMessage('hideBookmarksInPage'));
    create(book, 'number', { id: 'showBookmarksLimit' }, chrome.i18n.getMessage('showBookmarksLimit'));
    create(feed, 'checkbox', { id: 'showToolTips' }, chrome.i18n.getMessage('showToolTips'));
    create(feed, 'number', { id: 'showToast' }, chrome.i18n.getMessage('showToast'));
    create(layout, 'checkbox', { id: 'lock' }, chrome.i18n.getMessage('lock'));
    create(layout, 'checkbox', { id: 'allowCollapsingLocked' }, chrome.i18n.getMessage('allow_collapsing_locked'));
    create(layout, 'checkbox', { id: 'savePanelStatusLocked' }, chrome.i18n.getMessage('save_panel_status_locked'));
    create(layout, 'checkbox', { id: 'proportionalSections' }, chrome.i18n.getMessage('proportionalSections'));
    create(layout, 'range', { id: 'space', max: '200', min: '0', step: '5' }, chrome.i18n.getMessage('space'));
    create(layout, 'range', { id: 'fontsize', max: '150', min: '50', step: '10' }, chrome.i18n.getMessage('fontsize'));
    create(layout, 'checkbox', { id: 'useCustomScrollbar' }, chrome.i18n.getMessage('useCustomScrollbar'));
    create(layout, 'checkbox', { id: 'editOnNewDrop' }, chrome.i18n.getMessage('editOnNewDrop'));
    create(agenda, 'number', { id: 'agendaNb' }, chrome.i18n.getMessage('agenda_nb'));
    create(agenda, 'number', { id: 'titleAgendaNb' }, chrome.i18n.getMessage('title_agenda_nb'));
    create(agenda, 'checkbox', { id: 'showLocationAgenda' }, chrome.i18n.getMessage('showLocationAgenda'));
    create(agenda, 'checkbox', { id: 'showEndDateAgenda' }, chrome.i18n.getMessage('showEndDateAgenda'));
    create(configureShortcut, 'show', { id: 'textConfigure' }, chrome.i18n.getMessage('configure_shortcut'));
  }
  updatePageWithPrefs(prefs);
}
function exportHTML() {
  const now = (new Date()).toISOString().slice(0, 10).replace(/-/g, '_');
  const el = document.createElement('a');
  el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(OPTS.html));
  el.setAttribute('download', `sst_backup_${now}.html`);
  el.click();
}
function importHTML() {
  util.simulateClick('#fileupload');
}
function importLoadedFile(file) {
  if (file.target && typeof file.target.result === 'string') {
    OPTS.backup = OPTS.html;
    OPTS.html = file.target.result;
    saveOptions();
  }
}
function upload(file) {
  if (file) {
    const reader = new FileReader();
    reader.addEventListener('load', importLoadedFile);
    reader.readAsText(file);
  }
}
function uploadFile(e) {
  e.preventDefault();
  if (e.dataTransfer) {
    const file = e.dataTransfer.files[0];
    upload(file);
  }
}
function uploadFiles(e) {
  e.preventDefault();
  const target = e.target;
  const file = target.files && target.files[0];
  upload(file);
}
function resetHTML() {
  const backup = confirm(chrome.i18n.getMessage('suggest_backup'));
  if (backup) {
    exportHTML();
  }
  OPTS.html = chrome.i18n.getMessage('default_message');
  options.write();
}
function prepareListeners() {
  // ! ensures that if any of these elems don't exist a NPE is thrown.
  document.getElementById('export').addEventListener('click', exportHTML);
  document.getElementById('import').addEventListener('click', importHTML);
  document.getElementById('reset').addEventListener('click', resetHTML);
  const importDropZone = document.getElementById('importdropzone');
  importDropZone.addEventListener('dragover', e => e.preventDefault());
  importDropZone.addEventListener('drop', uploadFile);
  const fileupload = document.getElementById('fileupload');
  fileupload.addEventListener('change', uploadFiles, false);
  chrome.runtime.onMessage.addListener(receiveBackgroundMessages);
}
export async function loadOptions() {
  await options.load();
  createPageWithPrefs(OPTS);
  prepareListeners();
  util.prepareCSSVariables(OPTS);
  util.localizeHtml(document);
  toast.prepare();
}
export function saveOptions() {
  updatePrefsWithPage();
  updatePageWithPrefs(OPTS);
  util.prepareCSSVariables(OPTS);
  options.write();
}
function toggleBookmarks() {
  util.simulateClick('#showBookmarksSidebar');
}
function receiveBackgroundMessages(m) {
  switch (m.item) {
    //    case 'emptytrash': emptyTrash(); break;
    case 'toggle-sidebar':
      toggleBookmarks();
      break;
    default: break;
  }
}
window.addEventListener('load', loadOptions);
