// default options - these are reverted to
// if there are no options in the browser's sync store.


export interface NumberOpts {
  showToast: number,
  showBookmarksLimit: number,
  space: number,
  fontsize: number,
}

export interface BooleanOpts {
  showToolTips: boolean,
  lock: boolean,
  proportionalSections: boolean,
  showBookmarksSidebar: boolean,
  hideBookmarksInPage: boolean,
  useCustomScrollbar: boolean,
}

export interface StringOpts {
  html: string,
  backup: string,
}

export interface Options extends NumberOpts, BooleanOpts, StringOpts {
  storage: 'local'|'sync',
}


// eslint-disable-next-line import/prefer-default-export
export const OPTS: Options = {

  // NumberOpts
  fontsize: 100,
  showBookmarksLimit: 20,
  showToast: 5,
  space: 100,

  // BooleanOpts
  hideBookmarksInPage: true,
  lock: false,
  proportionalSections: true,
  showBookmarksSidebar: true,
  showToolTips: true,
  useCustomScrollbar: true,

  // StringOpts
  storage: 'local',
  backup: '',
  html: chrome.i18n.getMessage('default_message'),
};
