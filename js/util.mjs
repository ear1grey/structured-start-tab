"use strict";
function copyPathToClipboard(e) {
  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(e.target);
  selection.removeAllRanges();
  selection.addRange(range);
  document.execCommand("copy");
}

export function prepareClickables() {
  let clickables = document.querySelectorAll(".clicktocopy");
  for (const clickable of clickables) {
    clickable.addEventListener('click', copyPathToClipboard);
  }
}


// if the testable attribute is set, then check the URL can be connected
// to and if so, add the active or inactive class.
// if (data.testable) {
//   const up = await urlActiveCheck(data.href);
//   a.classList.add(up ? "up" : "down");
// }
async function urlActiveCheck(url) {
  try {
    const opts = {
      method: 'HEAD'
    };
    const response = await fetch(url, opts);
    return (await response).ok;
  } catch (e) {
    return false;
  }
}

