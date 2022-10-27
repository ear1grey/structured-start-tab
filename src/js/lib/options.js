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
export function load() {
  const dataAsString = localStorage.getItem('structured-start-tab');
  if (dataAsString) {
    const data = JSON.parse(dataAsString);
    Object.assign(OPTS, data);
  }
  return Promise.resolve();
}
export function write() {
  localStorage.setItem('structured-start-tab', JSON.stringify(OPTS));
  return Promise.resolve();
}
