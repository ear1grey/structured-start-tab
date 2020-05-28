let dragging = null;


function updateConfig(what) {
  // FIRST: modify config to add uids to all entries
  // what has a UID, find it in the config
  // remove it from where it is in the config
  // find the UID of what's parent in the page
  // find that UID in the config
  // add what to it
}

/*
 * For a given elem, if it's not a container
 * element, return its parent.
 */
function findContainer(elem) {
  if (elem.firstElementChild) {
    return elem;
  } else {
    return elem.parentElement;
  }
}

/*
 * add a placeholder element to the position where the
 * current thing would be dropped
 */
function moveElement(tgt) {
  const dropTarget = findContainer(tgt);
  if (dropTarget === dragging) return;
  if (dropTarget === tgt) {
    dropTarget.append(dragging);
  } else {
    dropTarget.insertBefore(dragging, tgt);
  }
}

/* respond when a drag begins */
function dragStart(e) {
  if (e.target.classList.contains('metamouseover')) {
    dragging = e.target;
    dragging.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  } else {
    e.preventDefault();
  }
}

/* respond if dropping here is ok */
function dragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  moveElement(e.target);
}

function dragEnd(e) {
  e.preventDefault();
  updateConfig(dragging);
}

/*
 * make all links within a doc draggable
 */
export function prepareDrag() {
  const links = document.querySelectorAll('a');
  for (const link of links) {
    link.draggable = true;
  }
  document.addEventListener('dragstart', dragStart);
  document.addEventListener('dragover', dragOver);
  document.addEventListener('dragend', dragEnd);
}
