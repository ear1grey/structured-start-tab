// define the menu item
const menuItems:chrome.contextMenus.CreateProperties[] = [
  {
    id: 'emptytrash',
    title: 'Empty Trash',
  },
  {
    id: 'togglebookmarks',
    title: 'Toggle Bookmarks',
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

function menuInstaller() {
  const indexURL = chrome.runtime.getURL('app/index.html');
  for (const menuItem of menuItems) {
    menuItem.documentUrlPatterns = [indexURL];
    menuItem.contexts = ['page'];
    chrome.contextMenus.create(menuItem);
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
