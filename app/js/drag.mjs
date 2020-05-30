let dragging, OPTS, STORE;

function updateConfig(what) {
  OPTS.backup = OPTS.html;
  OPTS.html = document.querySelector('main').innerHTML;
  STORE.set(OPTS, () => console.log('saved'));
}

/* For a given elem, if it's not a container element, return its parent. */
const findContainer = (elem) => elem.firstElementChild ? elem : elem.parentElement;

/*
 * add a placeholder element to the position where the
 * current thing would be dropped
 */
function moveElement(tgt) {
  const dropTarget = findContainer(tgt);
  if (dropTarget === dragging) return;
  if (dropTarget === tgt) {
    if (dropTarget.children.length > 0) {
      // only drop directly ina div if it's empty
      // otherwise drop on an element to insert before it
      dropTarget.append(dragging);
    }
  } else {
    dropTarget.insertBefore(dragging, tgt);
  }
}

/* respond when a drag begins */
function dragStart(e) {
  console.log(e.target);
  if (e.target.classList.contains('metamouseover')) {
    // || e.target.tagName === "DIV"
    dragging = e.target;
    dragging.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
  } else {
    e.preventDefault();
  }
}

/* respond if dropping here is ok */
function dragOver(e) {
  e.preventDefault();
  moveElement(e.target);
}

function dragEnd(e) {
  e.preventDefault();
  dragging.classList.remove('dragging');
  dragging.classList.remove('fresh');
  updateConfig(dragging);
}

/*
 * make all links within a doc draggable
 */
export function prepareDrag(O) {
  OPTS = O;
  STORE = chrome.storage[OPTS.storage];
  const links = document.querySelectorAll('a');
  for (const link of links) {
    link.draggable = true;
  }
  document.addEventListener('dragstart', dragStart);
  document.addEventListener('dragover', dragOver);
  document.addEventListener('dragend', dragEnd);
}
