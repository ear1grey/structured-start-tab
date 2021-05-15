export interface LinkStats {
  [url:string]:number,
}

export interface NumberOpts {
  showToast: number,
  showBookmarksLimit: number,
  space: number,
  fontsize: number,
  agendaNb: number,
}

export interface BooleanOpts {
  showToolTips: boolean,
  lock: boolean,
  proportionalSections: boolean,
  showBookmarksSidebar: boolean,
  hideBookmarksInPage: boolean,
  useCustomScrollbar: boolean,
  editOnNewDrop: boolean,
  allowCollapsingLocked: boolean,
  savePanelStatusLocked: boolean,
}

export interface StringOpts {
  html: string,
  backup: string,
  agendaUrl: string,
}

export interface StatsOpts {
  linkStats: LinkStats
}

export interface Options extends NumberOpts, BooleanOpts, StringOpts, StatsOpts {}
