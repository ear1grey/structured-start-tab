

function handleTypingAnywhere(event) {
  console.log(event.code);

  if (event.altKey && event.ctrlKey && event.code == 'KeyO') {
    let old = document.querySelectorAll('.old');
    for (const elem of old) {
      elem.classList.toggle('hide');
    }
    return;
  }


  if (ignored.includes(event.code)) {
    return true;
  }

  if (event.code == 'Escape') {
    highlight('');
    return;
  }
}

window.document.addEventListener('keyup', handleTypingAnywhere);

  main.classList.add("visible");
  aside.classList.add("visible");


function anchorControl(searchText, currentNode, result) {
  if (highlightThese.includes(currentNode.nodeName)) {
    if (currentNode.textContent.toLowerCase().includes(searchText)) {
      if (currentNode.nodeName === 'A') {
        // if it's an anchor, then make it tabbable
        currentNode.tabIndex = 1000;
        result.push(currentNode);
      }
      // anchors and sections should be marked as matches so that
      // sections which contain anchors don't get dimmed
      currentNode.dataset.matches = 1;
    } else {
      currentNode.tabIndex = -1;
      currentNode.dataset.matches = 0;
    }
  }
}

function doNotFollowDisabledLinks(e) {
  if (e.target.nodeName == 'A' && e.target.dataset.matches == 0) {
    console.log('disabled');
    e.preventDefault();
    return false;
  }
  if (e.target.nodeName == 'DIV' && e.target.parentElement.nodeName == "MAIN") {
    e.target.classList.toggle("hide");
  }
}


// loop over the array of things
function walk(searchText, things, result) {
  for (let i = 0; i < things.length; i++) {
    anchorControl(searchText, things[i], result);
    if (things[i].children) {
      // recurse into subnodes
      walk(searchText, things[i].children, result);
    }
  }
}



const highlightThese = ['A', 'SECTION'];

const ignored = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'MetaLeft',
  'MetaRight',
  'AltLeft',
  'AltRight',
  'ControlLeft',
  'ControlRight',
  'ShiftLeft',
  'ShiftRight'
];

