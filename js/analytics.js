let hist = {};

function saveClicks() {
  chrome.storage.sync.set({
      'clicks': JSON.stringify(hist)
    },
    (x) => console.log('stored', x)
  );
}

function loadClicks() {
  chrome.storage.sync.get(['clicks'], (rawhist) => {
    hist = JSON.parse(rawhist.clicks);
  });
}
