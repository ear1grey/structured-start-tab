import { htmlStringToJson } from '../services/parser.service.js';
import { newUuid } from './util.js';

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
  // Cloud sync settings
  cloud: {
    userId: null,
    version: 0,
    hasConflict: false,

    enabled: false,
    url: '',

    syncMode: 'manual',
    syncFoldStatus: false,
    syncPrivateStatus: false,
    newChanges: false,
  },
};

const settingKey = 'structured-start-tab';

export function load() {
  return new Promise(resolve => {
    chrome.storage.local.get([settingKey], async (result) => {
      if (!result[settingKey]) {
        result[settingKey] = {};
      }

      deepAssign(OPTS, result[settingKey]);

      // If the user has no cloud id, generate one
      if (!OPTS.cloud.userId) {
        const chromeUserId = (await chrome?.identity?.getProfileUserInfo())?.id;
        OPTS.cloud.userId = chromeUserId || newUuid();
      }

      // if the json obj is empty, it means that is the first time the extension is installed or it is migrated from <1.10.0
      if (!OPTS.json || Object.keys(OPTS.json).length === 0) {
        OPTS.json = htmlStringToJson(chrome.i18n.getMessage('default_message'));
        write();
      }

      resolve();
    });
  });
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
