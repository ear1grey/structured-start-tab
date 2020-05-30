import * as options from './options.mjs';
import { prepareBookmarks } from './bookmarks.mjs';
import { prepareDrag } from './drag.mjs';
import { OPTS } from './defaults.mjs';

const STORE = chrome.storage[OPTS.storage];
let el = {};

function mouseOverLink(e) {
  if (e.metaKey) {
    e.target.classList.add('metamouseover');
  } else {
    e.target.classList.remove('metamouseover');
  }
}

function mouseOutLink(e) {
  e.target.classList.remove('metamouseover');
}


/** A unique-enough uid */
function genUid() {
  return window.btoa(Date.now() * Math.random()).slice(-8).toLowerCase();
}

/* Create an object that can be safely used to refer to elements
 * in the dom. similar to window.id but without the risk of
 * clashing variable names and with the bonus of being able
 * to use a comma separated list of CSS selectors
 */
function prepareElements(selectors = '[id]') {
  const el = {};
  const elems = document.querySelectorAll(selectors);
  elems.forEach(e => { el[e.id ? e.id : e.tagName.toLowerCase()] = e; });
  return el;
}


function editStart(elem) {
  el.editHeading.value = 'Editing...';
  el.editName.value = elem.textContent;
  el.editURL.value = elem.href;
  el.editID.value = elem.id;
  el.body.classList.add('editing');
  el.editing = elem;
  el.editName.focus();
}


function linkClicked(e) {
  if (e.metaKey) {
    e.preventDefault();
    editStart(e.target);
  } else {
    // default action is to open URL in link
  }
}

function editCancel() {
  el.editName.value = '';
  el.editURL.value = '';
  el.editID.value = '';
  el.body.classList.remove('editing');
}

  // store the updated version
  function editOk() {
  STORE.set(OPTS, () => {
    // update UI
    el.editing.textContent = el.editName.value;
    el.editing.href = el.editURL.value;
    el.body.classList.remove('editing');
  });
}


function makeVisible() {
  el.main.classList.add('visible');
  el.aside.classList.add('visible');
}

function removeClassEverywhere(clsName) {
  const all = [...document.getElementsByClassName(clsName)];
  all.forEach(e => e.classList.remove(clsName));
}

function detectKeyup(e) {
  if (e.key === 'Meta') {
    el.main.classList.remove('editing');
    removeClassEverywhere('metamouseover');
  }
  if (e.key === 'Escape') {
    editCancel();
    el.main.classList.remove('editing');
  }
}

function detectKeydown(e) {
  if (e.key === 'Meta') {
    e.target.classList.add('metamouseover');
    el.main.classList.add('editing');
  } else {
    e.target.classList.remove('metamouseover');
    el.main.classList.remove('editing');
  }

  if (e.key === 'Enter') {
    if (e.target.tagName === 'INPUT') {
      e.target.nextElementSibling.focus();
    }
  }

  if (e.code === 'KeyZ' && (e.metaKey || e.ctrlKey)) {
    console.log('Undo');
    if (OPTS.backup) {
      const prev = OPTS.html;
      OPTS.html = OPTS.backup;
      OPTS.backup = prev;
    }
    STORE.set(OPTS, () => {
      replaceContent(OPTS.html);
      console.log('undo complete and stored');
    });
  }
}


function prepareListeners() {
  const anchors = document.querySelectorAll('a');
  for (const a of anchors) {
    a.addEventListener('click', linkClicked);
    a.addEventListener('mousemove', mouseOverLink);
    a.addEventListener('mouseout', mouseOutLink);
  }
  document.addEventListener('keydown', detectKeydown);
  document.addEventListener('keyup', detectKeyup);
  el.editok.addEventListener('click', editOk);
  el.editcancel.addEventListener('click', editCancel);
}


function replaceContent(html) {
  el.main.innerHTML = html;
  prepareListeners();
}

async function connectListeners() {
  await options.loadOptionsWithPromise();
  el = prepareElements('[id], body, main, aside, footer');
  prepareBookmarks(OPTS, el.aside);
  replaceContent(OPTS.html);
  prepareDrag(OPTS);
  makeVisible();
}

window.addEventListener('DOMContentLoaded', connectListeners);
