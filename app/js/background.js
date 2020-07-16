// define the menu item 
const menuItems = [
  {
    id: 'emptytrash',
    title: 'Empty Trash',
  },
  {
    id: 'togglebookmarks',
    title: 'Toggle Bookmarks',
  },
];

// message sender used whenever any of our
// menu items* are clicked.
// * currently any of 1. 
function menuClicked(info, tab) {
  chrome.tabs.sendMessage(tab.id, { item: info.menuItemId });
}

function menuInstaller() {
  const indexURL = chrome.runtime.getURL('app/index.html');
  for (const menuItem of menuItems) {
    menuItem.documentUrlPatterns = [indexURL];
    menuItem.contexts = ['page'];
    chrome.contextMenus.create(menuItem);
  }
}

chrome.runtime.onInstalled.addListener(menuInstaller);
chrome.contextMenus.onClicked.addListener(menuClicked);
