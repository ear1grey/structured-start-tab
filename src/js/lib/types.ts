export interface LinkStats {
  [url:string]:number,
}

export interface IcalEvent {
  title: string,
  startDate: string,
  endDate: string,
  location: string,
  utcDate: number,
  url: string,
}

export interface Agenda {
  agendaUrl: string,
  events: IcalEvent[],
  email: string,
}

export interface NumberOpts {
  showToast: number,
  showBookmarksLimit: number,
  space: number,
  fontsize: number,
  agendaNb: number,
  titleAgendaNb: number,
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
  showLocationAgenda: boolean,
  showEndDateAgenda: boolean,
}

export interface StringOpts {
  html: string,
  backup: string,
}

export interface ObjectOpts {
  linkStats: LinkStats,
  agendas: Agenda[],
}

export interface Options extends NumberOpts, BooleanOpts, StringOpts, ObjectOpts {}
