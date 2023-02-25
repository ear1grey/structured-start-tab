import * as options from '../lib/options.js';

import { parseIcs } from '../lib/icalparse.js';
import { OPTS } from '../lib/options.js';
import { getAllBySelector } from '../lib/util.js';

/** Update all agendas */
export async function updateAgendasBackground() {
  await options.load();
  OPTS.agendas.forEach(async (agenda) => {
    await updateAgendaBackground(agenda);
  });
}

/** Update specific agenda */
export async function updateAgendaBackground(agenda) {
  if (!agenda.agendaUrl || agenda.agendaUrl === chrome.i18n.getMessage('default_agenda_link')) { return; }
  try {
    const response = await fetch(agenda.agendaUrl);
    const text = await response.text();
    await parseIcs(text, agenda, agenda.email);
  } catch (e) { }
}

export async function updateAgenda(updateAgendas = true) {
  for (let index = 0; index < OPTS.agendas.length; index++) {
    const agenda = OPTS.agendas[index];
    if (!agenda.agendaUrl || agenda.agendaUrl === chrome.i18n.getMessage('default_agenda_link')) { continue; }
    if (agenda.events.length === 0 && updateAgendas) {
      await updateAgendaBackground(agenda);
    }
    displayNewAgenda(agenda);
  }
}

export function displayNewAgenda(agenda) {
  const rootPanel = getAllBySelector(document.querySelector('main'), `#${agenda.agendaId}`)[0]?.$panel;
  if (!rootPanel) { return; }
  while (rootPanel.lastElementChild.firstChild) {
    rootPanel.lastElementChild.removeChild(rootPanel.lastElementChild.lastChild);
  }
  for (const event of agenda.events.slice(0, OPTS.agendaNb)) {
    const agendaItem = document.createElement('agenda-item');
    agendaItem.setAttribute('time', event.utcDate);
    agendaItem.setAttribute('title', event.title);
    agendaItem.setAttribute('href', event.url);
    rootPanel.querySelector('nav').append(agendaItem);
  }
}

export function getAgendasFromObject(obj, agendas = []) {
  if (obj.id === 'trash') { return; }
  if (Array.isArray(obj)) {
    obj.forEach((item) => {
      getAgendasFromObject(item, agendas);
    });
  } else if (Array.isArray(obj.content) && obj.content?.length > 0) {
    obj.content.forEach((item) => {
      getAgendasFromObject(item, agendas);
    });
  } else if (obj.id?.includes('agenda')) {
    agendas.push(obj.id);
  }
}
