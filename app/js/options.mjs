// or chrome.storage.sync

// load default option values from a file
// these defaults are replaced  thereafter if it's possible to initial values here are app defaults
import { OPTS } from './defaults.mjs';
import * as toast from './toast.mjs';
import * as util from './util.mjs';

const STORE = chrome.storage.local;

function setCheckBox(prefs, what) {
  document.getElementById(what).checked = prefs[what];
}

function getCheckBox(what) {
  OPTS[what] = document.getElementById(what).checked;
}

function setValue(prefs, what, defaultValue = 0) {
  document.getElementById(what).value = prefs[what] || defaultValue;
}

function getValue(what) {
  OPTS[what] = document.getElementById(what).value;
}

export function loadOptionsWithPromise() {
  return new Promise((resolve, reject) => {
    STORE.get(OPTS, (items) => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        reject(chrome.runtime.lastError.message);
      } else {
        for (const key in items) {
          OPTS[key] = items[key];
        }
        resolve(items);
      }
    });
  });
}

// incorporate the latest values of the page into
// the OPTS object that gets stored.
function updatePrefsWithPage() {
  getCheckBox('lock');
  getCheckBox('showBookmarksSidebar');
  getCheckBox('showToolTips');
  getCheckBox('proportionalSections');
  getValue('showToast');
  getValue('showBookmarksLimit');
  getValue('space');
  getValue('fontsize');
}

function updatePageWithPrefs(prefs) {
  setCheckBox(prefs, 'lock');
  setCheckBox(prefs, 'showBookmarksSidebar');
  setCheckBox(prefs, 'showToolTips');
  setCheckBox(prefs, 'proportionalSections');
  setValue(prefs, 'showToast');
  setValue(prefs, 'showBookmarksLimit');
  setValue(prefs, 'space');
  setValue(prefs, 'fontsize');
}

function cloneTemplate(selector) {
  const template = document.querySelector(selector);
  return document.importNode(template.content, true);
}

/**
 * Creates a new 'option' based on a template.
  * @param where - where to insert the option
  * @param type - which template to use
  * @param attrs - to be added to the input element (e.g. max, min)
  * @param txt - text for the label
  */
function create(where, type, attrs, txt) {
  let elem = cloneTemplate('#template_' + type);
  where.append(elem);
  elem = where.lastElementChild;
  elem.setAttribute('for', attrs.id);
  const input = elem.querySelector('[name=input]');
  for (const [attr, val] of Object.entries(attrs)) {
    input[attr] = val;
  }
  if (txt) {
    elem.querySelector('[name=text]').textContent = txt;
  }
  elem.addEventListener('input', saveOptions);

  return elem;
}

function createPageWithPrefs(prefs) {
  const settings = document.querySelector('#settings');
  const layout = create(settings, 'section', {}, 'Layout');
  const book = create(settings, 'section', {}, 'Bookmarks');
  const feed = create(settings, 'section', {}, 'Messages & Feedback');
  create(book, 'checkbox', { id: 'showBookmarksSidebar' }, 'Include a sidebar of most recent bookmarks.');
  create(book, 'number', { id: 'showBookmarksLimit' }, 'Number of recent bookmarks to show.');
  create(feed, 'checkbox', { id: 'showToolTips' }, 'Show helpful tooltips when hovering over things.');
  create(feed, 'number', { id: 'showToast' }, 'Time (in seconds) each feedback message is shown.   Setting this to zero will disable messages.');
  create(layout, 'checkbox', { id: 'lock' }, 'Lock page.', 'When locked, no drags can occur and no new links can be added.');
  create(layout, 'checkbox', { id: 'proportionalSections' }, 'Proportional Sections.');
  create(layout, 'range', { id: 'space', max: 200, min: 0, step: 5 }, 'Space between items.');
  create(layout, 'range', { id: 'fontsize', max: 150, min: 50, step: 10 }, 'Adjust font size.');
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
  document.querySelector('#fileupload').click();
}

function importLoadedFile(file) {
  OPTS.backup = OPTS.html;
  OPTS.html = file.target.result;
  saveOptions();
}

function upload(file) {
  if (file) {
    const reader = new FileReader();
    reader.addEventListener('load', importLoadedFile);
    reader.readAsText(file);
    console.log('loading');
  }
}

function uploadFile(e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  upload(file);
}

function uploadFiles(e) {
  e.preventDefault();
  const file = e.target.files[0];
  upload(file);
}


function prepareListeners() {
  document.getElementById('export').addEventListener('click', exportHTML);
  document.getElementById('import').addEventListener('click', importHTML);

  const importDropZone = document.getElementById('importdropzone');
  importDropZone.addEventListener('dragover', e => e.preventDefault());
  importDropZone.addEventListener('drop', uploadFile);

  const fileupload = document.getElementById('fileupload');
  fileupload.addEventListener('change', uploadFiles, false);
}

export async function loadOptions() {
  await loadOptionsWithPromise();
  createPageWithPrefs(OPTS);
  prepareListeners();
  util.prepareCSSVariables(OPTS);
  toast.prepare();
}

export function saveOptions() {
  console.log('saving');
  updatePrefsWithPage();
  STORE.set(OPTS, () => toast.popup('Option change stored.'));
}
