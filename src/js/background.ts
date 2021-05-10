// define the menu item
const menuItems:chrome.contextMenus.CreateProperties[] = [
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
    id: 'togglebookmarks',
    title: chrome.i18n.getMessage('togglebookmarks'),
  },
  {
    id: 'toggleAgenda',
    title: chrome.i18n.getMessage('toggleagenda'),
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
  chrome.runtime.getURL('app/index.html'),
  chrome.runtime.getURL('app/options.html'),
  'chrome://newtab/',
];


// message sender used whenever any of our
// menu items* are clicked.
// * currently any of 1.
function menuClicked(info: chrome.contextMenus.OnClickData, tab?:chrome.tabs.Tab) {
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { item: info.menuItemId as unknown });
  }
}

function menuInstaller(details: chrome.runtime.InstalledDetails) {
  const indexURL = chrome.runtime.getURL('app/index.html');
  for (const menuItem of menuItems) {
    menuItem.documentUrlPatterns = [indexURL];
    menuItem.contexts = ['page', 'link'];
    chrome.contextMenus.create(menuItem);
  }

  if (details.reason === 'update') {
    chrome.storage.local.get(null, items => {
      if (chrome.runtime.lastError) {
        console.error('cannot get the data');
      } else {
        if (Object.keys(items).length !== 0) {
          const importLastConfig = confirm(chrome.i18n.getMessage('import_config'));
          if (importLastConfig) {
            localStorage.setItem('structured-start-tab', JSON.stringify(items));
          }
        }
      }
    });
    chrome.storage.local.clear();
  }
}

function commandReceived(command:string) {
  chrome.tabs.query({ active: true, lastFocusedWindow: true }, tabs => {
    if (tabs.length === 0) return;
    if (!tabs[0].id) return;
    chrome.tabs.get(tabs[0].id, tab => {
      if (tab.url && tab.id && urls.includes(tab.url)) {
        chrome.tabs.sendMessage(tab.id, { item: command });
      }
    });
  });
}

chrome.runtime.onInstalled.addListener(menuInstaller);
chrome.contextMenus.onClicked.addListener(menuClicked);

chrome.commands.onCommand.addListener(commandReceived);
