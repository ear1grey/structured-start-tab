// default options - these are reverted to
// if there are no options in the browser's sync store.

import * as types from './types';

// eslint-disable-next-line import/prefer-default-export
export const OPTS: types.Options = {

  // NumberOpts
  fontsize: 100,
  showBookmarksLimit: 20,
  showToast: 5,
  space: 100,
  agendaNb: 5,

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

  // StringOpts
  backup: '',
  html: chrome.i18n.getMessage('default_message'),
  linkStats: {},
  agendaUrl: chrome.i18n.getMessage('default_agenda_link'),
};


export function load(): Promise<void> {
  const dataAsString = localStorage.getItem('structured-start-tab');
  if (dataAsString) {
    const data = JSON.parse(dataAsString) as types.Options;
    Object.assign(OPTS, data);
  }
  return Promise.resolve();
}

export function write(): Promise<void> {
  localStorage.setItem('structured-start-tab', JSON.stringify(OPTS));
  return Promise.resolve();
}
