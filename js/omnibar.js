
  if (EXTENSION) {
    chrome.omnibox.onInputChanged.addListener(omniInput);
    chrome.omnibox.onInputEntered.addListener(loadIt);
  }


function omniInput(txt, suggest) {

  const searchTxt = txt.toLowerCase();
  let matches = [];
  Object.keys(index).forEach(
    function (key, x) {
      if (key.toLowerCase().includes(searchTxt)) {
        console.log(key.includes(searchTxt), "comparing", searchTxt, "with", key);
        matches.unshift({
          content: index[key],
          description: key
        });
      }
    }
  );
  if (matches.length > 0) {
    matches = matches.slice(1, 3);
    console.log("Matches are", matches);
    suggest(matches);
    // suggest([
    //   {content: txt + " one", description: "the first one"},
    //   {content: txt + " number two", description: "the second entry"}
    //   ]);
    chrome.omnibox.setDefaultSuggestion({
      description: matches[0].description.replace(/[\u00A0-\u9999<>\&]/gim, ccode)
    });

  }
};


function loadIt(url, disposition) {
  console.log("Loading", url);

  if (disposition == "newBackgroundTab") {
    chrome.tabs.create({
      url,
      active: false
    });
  } else {
    chrome.tabs.create({
      url
    });
  }
}

