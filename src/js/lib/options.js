import { htmlStringToJson } from '../services/parser.service.js';
import { getAvailableServices } from '../services/sync.service.js';


// default options - these are reverted to
// if there are no options in the browser's sync store.
// eslint-disable-next-line import/prefer-default-export
export const OPTS = {
  // NumberOpts
  fontsize: 100,
  showBookmarksLimit: 20,
  showToast: 5,
  space: 100,
  agendaNb: 5,
  titleAgendaNb: 5,
  // BooleanOpts
  hideBookmarksInPage: true,
  lock: false,
  proportionalSections: true,
  showBookmarksSidebar: true,
  showToolTips: true,
  useCustomScrollbar: true,
  editOnNewDrop: true,
  allowCollapsingLocked: true,
  savePanelStatusLocked: false,
  showLocationAgenda: true,
  showEndDateAgenda: true,
  allowEmptyUrl: true,
  // StringOpts
  backup: '',
  json: [],
  linkStats: {},
  agendas: [],

  // Storage sync options
  sync: {
    enabled: false,

    mode: 'manual',
    syncFoldStatus: false,
    syncPrivateStatus: false,
    provider: 'firebase',

    // Sync status
    hasConflict: false,
    newChanges: false,

    // Sync dynamic properties
    settings: {},
  },
};

const settingKey = 'structured-start-tab';

export function load() {
  return new Promise(resolve => {
    chrome.storage.local.get([settingKey], (result) => {
      if (!result[settingKey]) {
        result[settingKey] = {};
      }

      deepAssign(OPTS, result[settingKey]);

      // Load sync services settings
      loadSyncServices();

      // if the json obj is empty, it means that is the first time the extension is installed or it is migrated from <1.10.0
      if (!OPTS.json || Object.keys(OPTS.json).length === 0) {
        OPTS.json = htmlStringToJson(chrome.i18n.getMessage('default_message'));
        write();
      }

      resolve();
    });
  });
}

function loadSyncServices() {
  const availableServices = getAvailableServices();

  for (const service of availableServices) {
    if (!Object.hasOwn(OPTS.sync.settings, service.id)) {
      OPTS.sync.settings[service.id] = {};
    }

    for (const settingProperty of service.settings) {
      if (!Object.hasOwn(OPTS.sync.settings[service.id], settingProperty.name)) {
        OPTS.sync.settings[service.id][settingProperty.name] = settingProperty.default;
      }
    }
  }

  // Make sure that any new property with a default value is set
  write();
}

function deepAssign(target, source) {
  if (Array.isArray(source)) {
    return source;
  }

  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object) {
      if (!target[key]) target[key] = {};
      Object.assign(source[key], deepAssign(target[key], source[key]));
    }
  }

  Object.assign(target || {}, source);
  return target;
}

export function write() {
  return new Promise(resolve => {
    chrome.storage.local.set({ [settingKey]: OPTS }, () => {
      resolve();
    });
  });
}
