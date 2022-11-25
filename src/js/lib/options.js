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
  // StringOpts
  backup: '',
  html: chrome.i18n.getMessage('default_message'),
  linkStats: {},
  agendas: [],
};

const settingKey = 'structured-start-tab';

export function load() {
  return new Promise(resolve => {
    chrome.storage.local.get([settingKey], (result) => {
      Object.assign(OPTS, result[settingKey]);
      resolve();
    });
  });
}
export function write() {
  return new Promise(resolve => {
    chrome.storage.local.set({ [settingKey]: OPTS }, () => {
      resolve();
    });
  });
}
