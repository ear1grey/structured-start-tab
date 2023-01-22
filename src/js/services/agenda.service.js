import { parseIcs } from '../lib/icalparse.js';
import { OPTS } from '../lib/options.js';
import * as options from '../lib/options.js';

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
