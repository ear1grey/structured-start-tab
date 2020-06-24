// or chrome.storage.sync

// load default option values from a file
// these defaults are replaced  thereafter if it's possible to initial values here are app defaults
import { OPTS } from './defaults.mjs'; const STORE = chrome.storage.local;

function afterSave() {
  window.location = 'index.html';
}

function setRadio(prefs, what) {
  document.getElementById(what).checked = prefs[what];
}

function getRadio(what) {
  OPTS[what] = document.getElementById(what).checked;
}

function setValue(prefs, what) {
  document.getElementById(what).value = prefs[what];
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
  getValue('showBookmarksLimit');
  getValue('html');
}

function updatePageWithPrefs(prefs) {
  setRadio(prefs, 'showBookmarksSidebar');
  setValue(prefs, 'showBookmarksLimit');
  setValue(prefs, 'html');
  document.getElementById('showBookmarksSidebar').checked = prefs.showBookmarksSidebar;
  document.getElementById('showBookmarksLimit').value = prefs.showBookmarksLimit;
}


export function prepareBackup(OPTS) {
  const html = document.getElementById('html');
  const el = document.createElement('a');
  el.textContent = 'backup this file';
  el.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(OPTS.html));
  el.setAttribute('download', 'sst_backup_' + new Date().toISOString() + '.html');
  html.insertAdjacentElement('afterend', el);
}


export async function loadOptions() {
  await loadOptionsWithPromise();
  updatePageWithPrefs(OPTS);
  prepareBackup(OPTS);
}

export function saveOptions() {
  updatePrefsWithPage();
  STORE.set(OPTS, afterSave);
}
