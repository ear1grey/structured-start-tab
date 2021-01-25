// or chrome.storage.sync

// load default option values from a file
// these defaults are replaced  thereafter if it's possible to initial values here are app defaults
import { OPTS, Options } from './defaults.js';
import * as toast from './toast.js';
import * as util from './util.js';

const STORE = chrome.storage.local;
const prefNames = [];

function setCheckBox(prefs:Options, what:string) {
  const elem = <HTMLInputElement> document.getElementById(what);
  elem.checked = <boolean> prefs[what];
}

function getCheckBox(what:string) {
  const elem = <HTMLInputElement> document.getElementById(what);
  OPTS[what] = elem.checked;
}

function setValue(prefs:Options, what:string, defaultValue = 0) {
  const elem = <HTMLInputElement> document.getElementById(what);
  elem.value = prefs[what] || defaultValue;
}

function getValue(what:string) {
  const elem = <HTMLInputElement> document.getElementById(what);
  OPTS[what] = elem.value;
}

export function loadOptionsWithPromise() {
  return new Promise((resolve, reject) => {
    STORE.get(OPTS, items => {
      if (chrome.runtime.lastError) {
        console.error(chrome.runtime.lastError.message);
        reject(chrome.runtime.lastError.message);
      } else {
        for (const key in items) {
          if (typeof OPTS[key] ==='number') {
            OPTS[key] = Number(items[key]);
          } else {
            OPTS[key] = items[key];
          }
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
  getCheckBox('hideBookmarksInPage');
  getCheckBox('showToolTips');
  getCheckBox('proportionalSections');
  getValue('showToast');
  getValue('showBookmarksLimit');
  getValue('space');
  getValue('fontsize');
}

function updatePageWithPrefs(prefs:Options) {
  setCheckBox(prefs, 'lock');
  setCheckBox(prefs, 'showBookmarksSidebar');
  setCheckBox(prefs, 'hideBookmarksInPage');
  setCheckBox(prefs, 'showToolTips');
  setCheckBox(prefs, 'proportionalSections');
  setValue(prefs, 'showToast');
  setValue(prefs, 'showBookmarksLimit');
  setValue(prefs, 'space');
  setValue(prefs, 'fontsize');
}

interface NonEmptyDocumentFragment extends DocumentFragment {
  lastElementChild:HTMLElement
}

export function cloneTemplate(selector:string):NonEmptyDocumentFragment {
  const template = document.querySelector(selector) as HTMLTemplateElement;
  if (template && template.content.lastElementChild) {
    return document.importNode(template.content, true) as NonEmptyDocumentFragment;
  }
  throw new Error("Template not found!");
}

interface ElAttrs {
  // id:string,
  [key:string]:string
}

/**
 * Creates a new 'option' based on a template.
  * @param where - where to insert the option
  * @param type - which template to use
  * @param attrs - to be added to the input element (e.g. max, min)
  * @param txt - text for the label
  */
function create(where:Element, type:string, attrs:ElAttrs, txt:string):Element {

  let elem = cloneTemplate('#template_' + type);
  where.append(elem);

  const elemInDoc = where.lastElementChild as Element;
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
        txtElem.textContent = txt;
      }
    }
    elemInDoc.addEventListener('input', saveOptions);
  }

  return elemInDoc;
}

function createPageWithPrefs(prefs:Options) {
  const settings = document.querySelector('#settings');
  if (settings) {
    const layout = create(settings, 'section', {}, 'Layout');
    const book = create(settings, 'section', {}, 'Bookmarks');
    const feed = create(settings, 'section', {}, 'Messages & Feedback');
    create(book, 'checkbox', { id: 'showBookmarksSidebar' }, 'Include a sidebar of most recent bookmarks.');
    create(book, 'checkbox', { id: 'hideBookmarksInPage' }, 'Omit bookmarks that are already in the page.');
    create(book, 'number', { id: 'showBookmarksLimit' }, 'Number of recent bookmarks to show.');
    create(feed, 'checkbox', { id: 'showToolTips' }, 'Show helpful tooltips when hovering over things.');
    create(feed, 'number', { id: 'showToast' }, 'Time (in seconds) each feedback message is shown.   Setting this to zero will disable messages.');
    create(layout, 'checkbox', { id: 'lock' }, 'Lock page.  When locked, no drags can occur and no new links can be added.');
    create(layout, 'checkbox', { id: 'proportionalSections' }, 'Proportional Sections.');
    create(layout, 'range', { id: 'space', max: "200", min: "0", step: "5" }, 'Space between items.');
    create(layout, 'range', { id: 'fontsize', max: "150", min: "50", step: "10" }, 'Adjust font size.');
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
  simulateClick('#fileupload');
}

function importLoadedFile(file:ProgressEvent<FileReader>) {
  if (file.target && typeof file.target.result === 'string') {
    OPTS.backup = OPTS.html;
    OPTS.html = file.target.result;
    saveOptions();
  }
}

function upload(file:File|null) {
  if (file) {
    const reader = new FileReader();
    reader.addEventListener('load', importLoadedFile);
    reader.readAsText(file);
    console.log('loading');
  }
}

function uploadFile(e:DragEvent) {
  e.preventDefault();
  if (e.dataTransfer) {
    const file = e.dataTransfer.files[0];
    upload(file);
  }
}

interface HTMLInputEvent extends Event {
  target: HTMLInputElement & EventTarget;
}

function uploadFiles(e:Event) {
  e.preventDefault();
  const target = e.target as HTMLInputElement;
  const file = target.files && target.files[0];
  upload(file);
}


function prepareListeners() {
  // ! ensures that if any of these elems don't exist a NPE is thrown.
  document.getElementById('export')!.addEventListener('click', exportHTML);
  document.getElementById('import')!.addEventListener('click', importHTML);

  const importDropZone = document.getElementById('importdropzone');
  importDropZone!.addEventListener('dragover', e => e.preventDefault());
  importDropZone!.addEventListener('drop', uploadFile);

  const fileupload = document.getElementById('fileupload');
  fileupload!.addEventListener('change', uploadFiles, false);

  chrome.runtime.onMessage.addListener(receiveBackgroundMessages);
  chrome.storage.onChanged.addListener(updateOptions);
}

export async function updateOptions() {
  await loadOptionsWithPromise();
  updatePageWithPrefs(OPTS);
  util.prepareCSSVariables(OPTS);
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

export function simulateClick(selector:string) {
  const inp = document.querySelector(selector);
  if (inp instanceof HTMLElement) {
    inp.click();
  }
}

function toggleBookmarks() {
  simulateClick('#showBookmarksSidebar');
}

function receiveBackgroundMessages(m:{item:string}) {
  switch (m.item) {
//    case 'emptytrash': emptyTrash(); break;
    case 'toggle-sidebar': toggleBookmarks(); break;
    default: break;
  }
}

