// or chrome.storage.sync

// load default option values from a file
// these defaults are replaced  thereafter if it's possible to initial values here are app defaults
import { OPTS } from './defaults.mjs'; const STORE = chrome.storage.local;

export function ok() {
  window.location = 'index.html';
}

function setRadio(prefs, what) {
  document.getElementById(what).checked = prefs[what];
}

function getRadio(what) {
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
  getRadio('showBookmarksSidebar');
  getRadio('proportionalSections');
  getValue('showBookmarksLimit');
  getValue('space');
  getValue('fontsize');
}

function updatePageWithPrefs(prefs) {
  setRadio(prefs, 'showBookmarksSidebar');
  setRadio(prefs, 'proportionalSections');
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
  elem.addEventListener('change', saveOptions);

  return elem;
}

function createPageWithPrefs(prefs) {
  const settings = document.querySelector('#settings');
  create(settings, 'checkbox', { id: 'proportionalSections' }, 'Proportional Sections.');
  create(settings, 'checkbox', { id: 'showBookmarksSidebar' }, 'Include a sidebar of most recent bookmarks.');
  create(settings, 'number', { id: 'showBookmarksLimit' }, 'Number of recent bookmarks to show.');
  create(settings, 'range', { id: 'space', max: 200, min: 0, step: 5 }, 'Space between items.');
  create(settings, 'range', { id: 'fontsize', max: 150, min: 50, step: 10 }, 'Adjust font size.');
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
  document.getElementById('ok').addEventListener('click', ok);
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
}

export function saveOptions() {
  console.log('saving');
  updatePrefsWithPage();
  STORE.set(OPTS);
}
