import * as options from '../lib/options.js';

import { parseIcs } from '../lib/icalparse.js';
import { OPTS } from '../lib/options.js';
import { getAllBySelector } from '../lib/util.js';

/** Update all agendas */
export async function updateAgendasBackground() {
  await options.load();
  for (let index = 0; index < OPTS.agendas.length; index++) {
    const agenda = OPTS.agendas[index];
    if (!agenda.agendaUrl || agenda.agendaUrl === chrome.i18n.getMessage('default_agenda_link')) { continue; }
    try {
      const response = await fetch(agenda.agendaUrl);
      const text = await response.text();
      await parseIcs(text, index, agenda.email);
    } catch (e) { }
  }
  await options.write();
}

/** Update specific agenda */
export async function updateAgendaBackground(agenda, index) {
  if (!agenda.agendaUrl || agenda.agendaUrl === chrome.i18n.getMessage('default_agenda_link')) { return; }
  try {
    const response = await fetch(agenda.agendaUrl);
    const text = await response.text();
    await parseIcs(text, index, agenda.email);
  } catch (e) { }
  await options.write();
}

export function displayNewAgenda(index, agenda) {
  const rootPanel = getAllBySelector(document.querySelector('main'), '#agenda-' + String(index))[0]?._panel;
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
