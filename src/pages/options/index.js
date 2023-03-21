// or chrome.storage.sync
// load default option values from a file
// these defaults are replaced  thereafter if it's possible to initial values here are app defaults
import * as toast from '../../js/lib/toast.js';
import * as util from '../../js/lib/util.js';
import * as options from '../../js/lib/options.js';
import * as io from '../../js/services/io.service.js';
import * as syncService from '../../js/services/sync.service.js';

import { OPTS } from '../../js/lib/options.js';
import { htmlStringToJson } from '../../js/services/parser.service.js';
import { getAgendasFromObject } from '../../js/services/agenda.service.js';

function setCheckBox(prefs, what) {
  const elem = document.getElementById(what);
  elem.checked = deepGet(prefs, what);
}
function getCheckBox(what) {
  const elem = document.getElementById(what);
  deepSet(OPTS, what, elem.checked);
}

function setValue(prefs, what, defaultValue = 0) {
  const elem = document.getElementById(what);
  elem.valueAsNumber = deepGet(prefs, what) || defaultValue;
}
function getValue(what) {
  const elem = document.getElementById(what);
  deepSet(OPTS, what, elem.valueAsNumber);
}

function setDropdown(prefs, what, defaultValue = 0) {
  const elem = document.getElementById(what);
  elem.value = deepGet(prefs, what) || defaultValue;
}
function getDropdown(what) {
  const elem = document.getElementById(what);
  deepSet(OPTS, what, elem.value);
}

function deepGet(obj, path) {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}
function deepSet(obj, path, value) {
  let schema = obj;
  const pList = path.split('.');
  const len = pList.length;
  for (let i = 0; i < len - 1; i++) {
    const elem = pList[i];
    if (!schema[elem]) schema[elem] = {};
    schema = schema[elem];
  }

  schema[pList[len - 1]] = value;
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
  getCheckBox('showFeedback');
  getCheckBox('proportionalSections');
  getCheckBox('useCustomScrollbar');
  getCheckBox('editOnNewDrop');
  getCheckBox('allowEmptyUrl');
  getCheckBox('showLocationAgenda');
  getCheckBox('showEndDateAgenda');
  getValue('showToast');
  getValue('showBookmarksLimit');
  getValue('space');
  getValue('fontsize');
  getValue('agendaNb');
  getValue('titleAgendaNb');

  // Sync
  getCheckBox('sync.enabled');
  getDropdown('sync.mode');
  getCheckBox('sync.syncFoldStatus');
  getCheckBox('sync.syncPrivateStatus');
  getDropdown('sync.provider');
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
  setCheckBox(prefs, 'allowEmptyUrl');
  setCheckBox(prefs, 'showLocationAgenda');
  setCheckBox(prefs, 'showEndDateAgenda');
  setValue(prefs, 'showToast');
  setValue(prefs, 'showBookmarksLimit');
  setValue(prefs, 'space');
  setValue(prefs, 'fontsize');
  setValue(prefs, 'agendaNb');
  setValue(prefs, 'titleAgendaNb');

  // Sync
  setCheckBox(prefs, 'sync.enabled');
  setDropdown(prefs, 'sync.mode');
  setCheckBox(prefs, 'sync.syncFoldStatus');
  setCheckBox(prefs, 'sync.syncPrivateStatus');
  setDropdown(prefs, 'sync.provider');

  // Defaults
  if (!util.isBeta()) { setCheckBox(prefs, 'showFeedback'); }
}
/**
 * Creates a new 'option' based on a template.
  * @param where - where to insert the option
  * @param type - which template to use
  * @param attrs - to be added to the input element (e.g. max, min)
  * @param txt - text for the label
  */
function create(where, type, attrs, txt, defaultValue, readonly, customEvents = []) {
  const elem = util.cloneTemplate('#template_' + type);
  where.append(elem);
  const elemInDoc = where.lastElementChild;
  if (elemInDoc) {
    if (attrs.id) elemInDoc.setAttribute('for', attrs.id);
    if (attrs.btnText) elemInDoc.querySelector('button').textContent = attrs.btnText;

    const input = elemInDoc.querySelector('[name=input], button, select');
    if (input) {
      for (const [attr, val] of Object.entries(attrs)) {
        // Skip attributes that are not for the input element
        if (['options', 'btnText'].includes(attr)) continue;
        input.setAttribute(attr, val);
      }

      if (defaultValue != null) {
        if (input.type === 'checkbox') input.checked = defaultValue;
        else input.value = defaultValue;
      }
      if (readonly) { input.disabled = true; }
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

    // Add options to dropdown
    if (type === 'dropdown') {
      const select = elemInDoc.querySelector('select');
      for (const option of attrs.options) {
        const opt = document.createElement('option');
        opt.value = option.value;
        opt.textContent = option.name;
        select.appendChild(opt);
      }
    }

    for (const { event, handler } of customEvents) {
      input.addEventListener(event, handler);
    }

    // Make sure content is saved when the content changes
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
    create(feed, 'checkbox', { id: 'showFeedback' }, chrome.i18n.getMessage('showFeedback'), true, util.isBeta());
    create(feed, 'show', { id: 'feedback' }, chrome.i18n.getMessage('feedback'));
    create(layout, 'checkbox', { id: 'lock' }, chrome.i18n.getMessage('lock'));
    create(layout, 'checkbox', { id: 'allowCollapsingLocked' }, chrome.i18n.getMessage('allow_collapsing_locked'));
    create(layout, 'checkbox', { id: 'savePanelStatusLocked' }, chrome.i18n.getMessage('save_panel_status_locked'));
    create(layout, 'checkbox', { id: 'proportionalSections' }, chrome.i18n.getMessage('proportionalSections'));
    create(layout, 'range', { id: 'space', max: '200', min: '0', step: '5' }, chrome.i18n.getMessage('space'));
    create(layout, 'range', { id: 'fontsize', max: '150', min: '50', step: '10' }, chrome.i18n.getMessage('fontsize'));
    create(layout, 'checkbox', { id: 'useCustomScrollbar' }, chrome.i18n.getMessage('useCustomScrollbar'));
    create(layout, 'checkbox', { id: 'editOnNewDrop' }, chrome.i18n.getMessage('editOnNewDrop'));
    create(layout, 'checkbox', { id: 'allowEmptyUrl' }, chrome.i18n.getMessage('allowEmptyUrl'));
    create(agenda, 'number', { id: 'agendaNb' }, chrome.i18n.getMessage('agenda_nb'));
    create(agenda, 'number', { id: 'titleAgendaNb' }, chrome.i18n.getMessage('title_agenda_nb'));
    create(agenda, 'checkbox', { id: 'showLocationAgenda' }, chrome.i18n.getMessage('showLocationAgenda'));
    create(agenda, 'checkbox', { id: 'showEndDateAgenda' }, chrome.i18n.getMessage('showEndDateAgenda'));
    create(configureShortcut, 'show', { id: 'textConfigure' }, chrome.i18n.getMessage('configure_shortcut'));

    // Sync
    buildSyncSettings(settings);
  }
  updatePageWithPrefs(prefs);
}

function buildSyncSettings(settings) {
  const sync = create(settings, 'section', {}, 'Sync');
  const availableServices = syncService.getAvailableServices();
  // SYNC
  create(sync, 'checkbox', { id: 'sync.enabled' }, chrome.i18n.getMessage('sync_enabled'), false, false, [
    {
      event: 'change',
      handler: (e) => {
        if (e.target.checked) {
          alert(chrome.i18n.getMessage('sync_warn_enable'));
        }
      },
    },
  ]);
  create(sync, 'dropdown', {
    id: 'sync.mode',
    options: [
      { name: 'Manual', value: 'manual' },
      { name: chrome.i18n.getMessage('sync_soft_push'), value: 'softPush' }, // Pushes creations
      { name: chrome.i18n.getMessage('sync_hard_push'), value: 'hardPush' }, // Pushes creations and deletions
      { name: chrome.i18n.getMessage('sync_soft_pull'), value: 'softPull' }, // Pulls creations
      { name: chrome.i18n.getMessage('sync_hard_pull'), value: 'hardPull' }, // Pulls creations and deletions
    ],
  }, chrome.i18n.getMessage('sync_sync_mode'));
  create(sync, 'checkbox', { id: 'sync.syncFoldStatus' }, chrome.i18n.getMessage('sync_syncFoldedStatus'), false);
  create(sync, 'checkbox', { id: 'sync.syncPrivateStatus' }, chrome.i18n.getMessage('sync_syncPrivateStatus'), false);

  create(sync, 'dropdown', {
    id: 'sync.provider',
    options: availableServices.map((service) => ({ name: service.friendlyName, value: service.id })),
  }, chrome.i18n.getMessage('sync_provider'), undefined, false, [
    {
      event: 'change',
      handler: () => {
        sync.remove();

        const settings = document.querySelector('#settings');
        if (settings) {
          buildSyncSettings(settings);
          updatePageWithPrefs(OPTS);
        }
      },
    },
  ]);

  const availableSettings = availableServices.find(service => service.id === OPTS.sync.provider).settings;
  for (const setting of availableSettings) {
    create(sync, setting.type, { id: `sync.settings.${OPTS.sync.provider}.${setting.id}` }, setting.friendlyName, setting.default, false, setting.customActions);
  }

  if (Object.hasOwn(OPTS.sync.settings, OPTS.sync.provider)) {
    loadSyncSettings({
      provider: OPTS.sync.provider,
      settings: OPTS.sync.settings[OPTS.sync.provider],
    });
  }

  if (syncService.panelShareAvailable()) {
    create(sync, 'button', { btnText: chrome.i18n.getMessage('remove') }, chrome.i18n.getMessage('sync_remove_shared_panels'), null, false, [
      {
        event: 'click',
        handler: async (e) => {
          try {
            util.addSpinner(e.target, true);
            await syncService.deleteAllPanels();
          } finally {
            util.removeSpinner({ element: e.target, display: 'block', enable: true });
          }
        },
      },
    ]);
  }
}

// Load settings for a specific provider
function loadSyncSettings({ provider, settings }) {
  for (const key in settings) {
    const input = document.getElementById(`sync.settings.${provider}.${key}`);
    if (input && settings[key]) input.value = settings[key];
  }
}

function saveSyncSettings(provider) {
  getCheckBox('sync.enabled');
  document.querySelectorAll(`[id^="sync.settings.${provider}"]`).forEach((input) => {
    deepSet(OPTS, input.id, input.value);
  });
}

function exportStartTab() {
  const now = (new Date()).toISOString().slice(0, 10).replace(/-/g, '_');
  io.downloadJson({
    name: `sst_backup_${now}.json`,
    data: OPTS.json,
  });
}
function importStartTab() {
  io.loadFile().then((file) => {
    importLoadedFile(file);
  });
}
function importLoadedFile(file) {
  if (file) {
    OPTS.jsonBackup = [...OPTS.json];

    // Keep support for old backups in HTML format
    if (file.includes('<section')) {
      OPTS.json = htmlStringToJson(file);
    } else {
      try {
        OPTS.json = JSON.parse(file);
      } catch (e) {
        alert('Invalid file');
        return;
      }
    }

    // Create an agenda object for each agenda found in the imported file
    const agendas = [];
    getAgendasFromObject(OPTS.json, agendas);
    if (agendas.length > 0) {
      OPTS.agendas = [];
      for (let i = 0; i < agendas.length; i++) {
        OPTS.agendas.push({
          agendaUrl: chrome.i18n.getMessage('default_agenda_link'),
          events: [],
          email: '',
        });
      }
    }

    saveOptions();
  }
}

function upload(file) {
  if (file) {
    const reader = new FileReader();
    reader.addEventListener('load', (file) => {
      if (typeof file?.target?.result === 'string') { importLoadedFile(file.target.result); }
    });
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

function resetStartTab() {
  const backup = confirm(chrome.i18n.getMessage('suggest_backup'));
  if (backup) {
    exportStartTab();
  }

  OPTS.json = htmlStringToJson(chrome.i18n.getMessage('default_message'));
  options.write();
}

function prepareListeners() {
  // ! ensures that if any of these elems don't exist a NPE is thrown.
  document.getElementById('export').addEventListener('click', exportStartTab);
  document.getElementById('import').addEventListener('click', importStartTab);
  document.getElementById('reset').addEventListener('click', resetStartTab);
  const importDropZone = document.getElementById('importdropzone');
  importDropZone.addEventListener('dragover', e => e.preventDefault());
  importDropZone.addEventListener('drop', uploadFile);
  chrome.runtime.onMessage.addListener(receiveBackgroundMessages);
}
export async function loadOptions() {
  await options.load();
  createPageWithPrefs(OPTS);
  prepareListeners();
  util.prepareCSSVariables(OPTS);
  util.localizeHtml(document);
  toast.prepare();

  saveOptions();
}
export function saveOptions() {
  updatePrefsWithPage();
  updatePageWithPrefs(OPTS);
  saveSyncSettings(OPTS.sync.provider);
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
