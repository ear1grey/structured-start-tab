const STORE = chrome.storage.local; // or chrome.storage.sync

// load default option values from a file
// these defaults are replaced  thereafter if it's possible to initial values here are app defaults
import { OPTS } from './defaults.mjs';

function afterSave() {
  document.getElementById('status').textContent = 'Options saved.';
  setTimeout(() => { document.getElementById('status').textContent = ''; }, 750);
  console.log('after save opts are', JSON.stringify(OPTS));
}

function setRadio(prefs, what) {
  document.getElementById(what).checked = prefs[what];
}

function getRadio(what) {
  OPTS[what] = document.getElementById(what).checked;
}

function setJSON(prefs, what) {
  document.getElementById(what).value = JSON.stringify(prefs[what], null, 2);
}

function getJSON(what) {
  try {
    OPTS[what] = JSON.parse(document.getElementById(what).value);
  } catch (e) {
    console.log({what});
    console.error(e);
  }
}

function setValue(prefs, what) {
  document.getElementById(what).value = prefs[what];
}

function getValue(what) {
  OPTS[what] = document.getElementById(what).value;
}

export function loadOptionsWithPromise() {
//  STORE.set({ separator: 'WXYZ' });
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
  getJSON('html');
}

function updatePageWithPrefs(prefs) {
  setRadio(prefs, 'showBookmarksSidebar');
  setValue(prefs, 'showBookmarksLimit');
  setJSON(prefs, 'html');
  document.getElementById('showBookmarksSidebar').checked = prefs.showBookmarksSidebar;
  document.getElementById('showBookmarksLimit').value = prefs.showBookmarksLimit;
}

export async function loadOptions() {
  await loadOptionsWithPromise();
  updatePageWithPrefs(OPTS);
}

export function saveOptions() {
  updatePrefsWithPage();
  STORE.set(OPTS, afterSave);
}
