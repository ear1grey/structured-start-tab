// or chrome.storage.sync

// load default option values from a file
// these defaults are replaced  thereafter if it's possible to initial values here are app defaults
import { OPTS, Options, BooleanOpts, NumberOpts, StringOpts } from './defaults.js';
import * as toast from './toast.js';
import * as util from './util.js';


function setCheckBox(prefs:Options, what: keyof BooleanOpts) {
  const elem = <HTMLInputElement> document.getElementById(what);
  elem.checked = prefs[what];
}

function getCheckBox(what: keyof BooleanOpts) {
  const elem = <HTMLInputElement> document.getElementById(what);
  OPTS[what] = elem.checked;
}

function setValue(prefs:Options, what: keyof NumberOpts, defaultValue = 0) {
  const elem = <HTMLInputElement> document.getElementById(what);
  elem.valueAsNumber = prefs[what] || defaultValue;
}

function getValue(what: keyof NumberOpts) {
  const elem = <HTMLInputElement> document.getElementById(what);
  OPTS[what] = elem.valueAsNumber;
}

function setText(prefs:Options, what: keyof StringOpts, defaultValue = '') {
  const elem = <HTMLInputElement> document.getElementById(what);
  console.log(prefs[what]);
  elem.value = prefs[what] || defaultValue;
}

function getText(what: keyof StringOpts) {
  const elem = <HTMLInputElement> document.getElementById(what);
  OPTS[what] = elem.value!;
}

export function loadOptionsWithPromise() :Promise<void> {
  return new Promise((resolve) => {
    const dataAsString = localStorage.getItem('structured-start-tab');
    if (dataAsString) {
      const data = JSON.parse(dataAsString) as Options;
      Object.assign(OPTS, data);
    }
    resolve();
  });
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
  getValue('showToast');
  getValue('showBookmarksLimit');
  getValue('space');
  getValue('fontsize');
  getText('agendaUrl');
}

function updatePageWithPrefs(prefs:Options) {
  setCheckBox(prefs, 'lock');
  setCheckBox(prefs, 'allowCollapsingLocked');
  setCheckBox(prefs, 'savePanelStatusLocked');
  setCheckBox(prefs, 'showBookmarksSidebar');
  setCheckBox(prefs, 'hideBookmarksInPage');
  setCheckBox(prefs, 'showToolTips');
  setCheckBox(prefs, 'proportionalSections');
  setCheckBox(prefs, 'useCustomScrollbar');
  setCheckBox(prefs, 'editOnNewDrop');
  setValue(prefs, 'showToast');
  setValue(prefs, 'showBookmarksLimit');
  setValue(prefs, 'space');
  setValue(prefs, 'fontsize');
  setText(prefs, 'agendaUrl');
}

interface NonEmptyDocumentFragment extends DocumentFragment {
  lastElementChild:HTMLElement
}

export function cloneTemplate(selector:string):NonEmptyDocumentFragment {
  const template = document.querySelector<HTMLTemplateElement>(selector);
  if (template && template.content.lastElementChild) {
    util.localizeHtml(template.content);
    return document.importNode(template.content, true) as NonEmptyDocumentFragment;
  }
  throw new Error('Template not found!');
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
  const elem = cloneTemplate('#template_' + type);
  where.append(elem);

  const elemInDoc = where.lastElementChild!;
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
    const layout = create(settings, 'section', {}, chrome.i18n.getMessage('layout'));
    const book = create(settings, 'section', {}, chrome.i18n.getMessage('bookmarks'));
    const feed = create(settings, 'section', {}, chrome.i18n.getMessage('messages'));
    const agenda = create(settings, 'section', {}, chrome.i18n.getMessage('agenda'));
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
    create(agenda, 'text', { id: 'agendaUrl' }, chrome.i18n.getMessage('agenda_url'));
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

function uploadFiles(e:Event) {
  e.preventDefault();
  const target = e.target as HTMLInputElement;
  const file = target.files && target.files[0];
  upload(file);
}

function resetHTML() {
  const backup = confirm(chrome.i18n.getMessage('suggest_backup'));
  if (backup) {
    exportHTML();
  }
  OPTS.html = chrome.i18n.getMessage('default_message');
  localStorage.setItem('structured-start-tab', JSON.stringify(OPTS));
}


function prepareListeners() {
  // ! ensures that if any of these elems don't exist a NPE is thrown.
  document.getElementById('export')!.addEventListener('click', exportHTML);
  document.getElementById('import')!.addEventListener('click', importHTML);
  document.getElementById('reset')!.addEventListener('click', resetHTML);

  const importDropZone = document.getElementById('importdropzone');
  importDropZone!.addEventListener('dragover', e => e.preventDefault());
  importDropZone!.addEventListener('drop', uploadFile);

  const fileupload = document.getElementById('fileupload');
  fileupload!.addEventListener('change', uploadFiles, false);

  chrome.runtime.onMessage.addListener(receiveBackgroundMessages);
}


export async function loadOptions() :Promise<void> {
  await loadOptionsWithPromise();
  createPageWithPrefs(OPTS);
  prepareListeners();
  util.prepareCSSVariables(OPTS);
  util.localizeHtml(document);
  toast.prepare();
}

export function saveOptions() :void {
  console.log('saving');
  updatePrefsWithPage();
  updatePageWithPrefs(OPTS);
  util.prepareCSSVariables(OPTS);
  localStorage.setItem('structured-start-tab', JSON.stringify(OPTS));
}

export function simulateClick(selector:string) :void {
  const inp = document.querySelector<HTMLElement>(selector);
  inp?.click();
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
