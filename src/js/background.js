import { parseIcs } from './lib/icalparse.js';
import { OPTS } from './lib/options.js';
import * as options from './lib/options.js';
// define the menu item
const menuItems = [
  {
    id: 'option',
    title: chrome.i18n.getMessage('option_context'),
  },
  {
    id: 'emptytrash',
    title: chrome.i18n.getMessage('emptytrash'),
  },
  {
    id: 'lock',
    title: chrome.i18n.getMessage('lock_context'),
  },
  {
    id: 'toggle-presentation',
    title: chrome.i18n.getMessage('presentation_mode'),
  },
  {
    id: 'togglebookmarks',
    title: chrome.i18n.getMessage('togglebookmarks'),
  },
  {
    id: 'addAgenda',
    title: chrome.i18n.getMessage('addAgenda'),
  },
  {
    id: 'topsitespanel',
    title: chrome.i18n.getMessage('topsitespanel'),
  },
  {
    id: 'bookmarkspanel',
    title: chrome.i18n.getMessage('bookmarkspanel'),
  },
  {
    id: 'duplicatePanel',
    title: chrome.i18n.getMessage('duplicatePanel'),
  },
  {
    id: 'withLink',
    parentId: 'duplicatePanel',
    title: chrome.i18n.getMessage('withLink'),
  },
  {
    id: 'withoutLink',
    parentId: 'duplicatePanel',
    title: chrome.i18n.getMessage('withoutLink'),
  },
  {
    id: 'add',
    title: chrome.i18n.getMessage('add'),
  },
  {
    id: 'addLink',
    parentId: 'add',
    title: chrome.i18n.getMessage('add_link_target'),
  },
  {
    id: 'addPanel',
    parentId: 'add',
    title: chrome.i18n.getMessage('add_panel_target'),
  },
];
const urls = [
  chrome.runtime.getURL('src/index.html'),
  chrome.runtime.getURL('src/options-page.html'),
  'chrome://newtab/',
];
// message sender used whenever any of our
// menu items* are clicked.
// * currently any of 1.
function menuClicked(info, tab) {
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { item: info.menuItemId });
  }
}
function menuInstaller() {
  const indexURL = chrome.runtime.getURL('src/index.html');
  for (const menuItem of menuItems) {
    menuItem.documentUrlPatterns = [indexURL];
    menuItem.contexts = ['page', 'link'];
    chrome.contextMenus.create(menuItem);
  }
  chrome.alarms.create('agendaUpdate', {
    periodInMinutes: 15,
  });
}
function commandReceived(command) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
    if (tabs.length === 0) { return; }
    if (!tabs[0].id) { return; }
    chrome.tabs.get(tabs[0].id, tab => {
      if (tab.url && tab.id && urls.includes(tab.url)) {
        chrome.tabs.sendMessage(tab.id, { item: command });
      }
    });
  });
}

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

chrome.runtime.onInstalled.addListener(menuInstaller);
chrome.contextMenus.onClicked.addListener(menuClicked);
chrome.alarms.onAlarm.addListener(updateAgendasBackground);
chrome.commands.onCommand.addListener(commandReceived);
