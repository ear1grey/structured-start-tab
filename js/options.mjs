// load default option values from a file
// these defaults are replaced  thereafter if it's possible to initial values here are app defaults
import { OPTS } from './defaults.mjs';

function afterSave() {
  document.getElementById('status').textContent = 'Options saved.';
  setTimeout(() => { document.getElementById('status').textContent = ''; }, 750);
  console.log("after save opts are", JSON.stringify(OPTS));
  
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
  chrome.storage.sync.set({"separator": "WXYZ"});
  return new Promise(((resolve, reject) => {
    console.log("before", JSON.stringify(OPTS));
    chrome.storage.sync.get(OPTS, (items) => {
      console.log("after", JSON.stringify(OPTS));
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
  }));
}

// incorporate the latest values of the page into
// the OPTS object that gets stored.
async function updatePrefsWithPage() {
  getRadio('showBookmarksSidebar');
  getValue('showBookmarksLimit');
  getValue('sourceFile');
}

function updatePageWithPrefs(prefs) {
  setRadio(prefs, 'showBookmarksSidebar');
  setValue(prefs, 'showBookmarksLimit');
  setValue(prefs, 'sourceFile');
  document.getElementById('showBookmarksSidebar').checked = prefs.showBookmarksSidebar;
  document.getElementById('showBookmarksLimit').value = prefs.showBookmarksLimit;
  document.getElementById('sourceFile').value = prefs.sourceFile;
}

export async function loadOptions() {
  console.log('Loading options.');
  await loadOptionsWithPromise();
  updatePageWithPrefs(OPTS);
}

export function saveOptions() {
  updatePrefsWithPage();
  chrome.storage.sync.set(OPTS, afterSave);
}

