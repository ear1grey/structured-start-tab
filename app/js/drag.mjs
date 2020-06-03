let dragging, dummy, OPTS, STORE;

function updateConfig() {
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
    if (dropTarget.children.length <= 1) {
      // only drop directly in a div if it's empty (with heading)
      // otherwise drop on an element to insert before it
      dropTarget.append(dragging);
    }
  } else {
    if (tgt.tagName === 'H1') {
      dropTarget.insertBefore(dragging, tgt.nextSibling);
    } else {
      dropTarget.insertBefore(dragging, tgt);
    }
  }
}

/* respond when a drag begins */
function dragStart(e) {
  console.log(e.target);
  if (e.target.classList.contains('metamouseover')) {
    dragging = e.target;
    dragging.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.dropEffect = 'move';
    return;
  }

  if (e.target.classList.contains('new')) {
    dummy = document.createElement('a');
    dummy.text = 'Example';
    dummy.href = 'http://example.org';
    dummy.draggable = true;
    dummy.classList.add('dragging');
    dragging = dummy;
    return;
  }

  e.preventDefault();
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
  if (dragging === dummy) {
    const evt = new CustomEvent('editrequest', { detail: { target: dummy } });
    document.dispatchEvent(evt);
    dummy = null;
  }
  updateConfig();
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
