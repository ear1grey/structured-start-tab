import * as options from './options.mjs';
import { prepareBookmarks } from './bookmarks.mjs';
import { OPTS } from './defaults.mjs';

const el = {};

function mouseOverLink(e) {
  if (e.metaKey) {
    e.target.classList.add('mouseover');
  } else {
    e.target.classList.remove('mouseover');
  }
}

function mouseOutLink(e) {
  e.target.classList.remove('mouseover');
}


// Accept an array of things that are either containers or links
// inject in the section template
// use the name
// stick in the links
//  if link has links - recurse
//  if link has no links - inject
function recursiveBuild(data, target, str = '') {
  // if it's an array, drill into it.
  if (Array.isArray(data)) {
    for (const x of data) {
      recursiveBuild(x, target, str);
    }
  }

  // if it's an object, check for an href
  // or if there is no href make a div
  if (data.href) {
    if (data.href === 'options') {
      // convert the word options into the options url
      data.href = chrome.extension.getURL('app/options.html');
    }

    // it's a link
    const a = document.createElement('a');
    a.dataset.href = data.href;
    a.dataset.uid = data.uid;
    a.textContent = data.name;
    target.appendChild(a);
    a.addEventListener('click', linkClicked);
    a.addEventListener('mousemove', mouseOverLink);
    a.addEventListener('mouseout', mouseOutLink);
  } else {
    if (data.name) {
      const div = document.createElement('div');
      const h = document.createElement('h1');
      h.textContent = data.name;
      div.appendChild(h);
      target.appendChild(div);
      if (data.id) {
        div.id = data.id;
      }
      if (data.hide) {
        div.classList.add('hide');
      }
      if (data.class) {
        if (Array.isArray(data.class)) {
          for (const cl of data.class) {
            div.classList.add(cl);
          }
        } else {
          div.classList.add(data.class);
        }
      } else if (data.name) {
        div.classList.add(data.name.toLowerCase()
          .replace(/[^a-z0-9]/g, ''));
      }
      if (data.links) {
        recursiveBuild(data.links, div, data.name ? str + OPTS.separator + data.name : str);
      }
    }
  }
}


/** A unique-enough uid */
function genUid() {
  return window.btoa(Date.now() * Math.random()).slice(-8).toLowerCase();
}

function recursiveId(data) {
  // if it's an array, drill into it.
  if (Array.isArray(data)) {
    for (const x of data) {
      recursiveId(x);
    }
  }

  // if it's an object, add an ID if necessary
  if (!data.uid) {
    data.uid = genUid();
  }
  if (data.links) {
    recursiveId(data.links);
  }
}

function build(OPTS, target) {
  recursiveBuild(OPTS.configJSON, target);
}


function editStart(elem) {
  el.editHeading.value = 'Editing...';
  el.editName.value = elem.textContent;
  el.editURL.value = elem.dataset.href;
  el.editUID.value = elem.dataset.uid;
  el.body.classList.add('editing');
  el.editing = elem;
  el.editName.focus();
}


function linkClicked(e) {
  if (e.metaKey) {
    editStart(e.target);
  } else {
    window.location = e.target.dataset.href;
  }
}

function editCancel() {
  el.editName.value = '';
  el.editURL.value = '';
  el.editUID.value = '';
  el.body.classList.remove('editing');
}

function recursiveReplace(data, orig, url, text) {
  // if it's an object, check for an href
  // or if there is no href make a div
  if (data.href === orig) {
    // replace
    data.href = url;
    data.name = text;
    return;
  }
  if (Array.isArray(data)) {
    for (const x of data) {
      recursiveReplace(x, orig, url, text);
    }
  }
  if (data.links) {
    recursiveReplace(data.links, orig, url, text);
  }
}

function editOk() {
  // find the entry in OPTS using the original URL.
  // replace the URL & text
  recursiveReplace(OPTS.configJSON, el.editUID.value, el.editURL.value, el.editName.value);

  // store the updated version
  chrome.storage.sync.set(OPTS, () => {
    // update UI
    el.editing.textContent = el.editName.value;
    el.editing.dataset.href = el.editURL.value;
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
    removeClassEverywhere('mouseover');
  }
  if (e.key === 'Escape') {
    editCancel();
    el.main.classList.remove('editing');
  }
}

function detectKeydown(e) {
  if (e.key === 'Meta') {
    e.target.classList.add('mouseover');
    el.main.classList.add('editing');
  } else {
    e.target.classList.remove('mouseover');
    el.main.classList.remove('editing');
  }

  if (e.key === 'Enter') {
    if (e.target.tagName === 'INPUT') {
      e.target.nextElementSibling.focus();
    }
  }
}

function prepElements(el) {
  el.body = document.querySelector('body');
  el.main = document.querySelector('main');
  el.aside = document.querySelector('aside');
  el.footer = document.querySelector('footer');
  el.editHeading = document.querySelector('#editheading');
  el.editName = document.querySelector('#editname');
  el.editURL = document.querySelector('#editurl');
  el.editUID = document.querySelector('#edituid');
  el.editCancel = document.querySelector('#editcancel');
  el.editOk = document.querySelector('#editok');
}

async function connectListeners() {
  await options.loadOptionsWithPromise();
  prepElements(el);
  recursiveId(OPTS.configJSON);
  build(OPTS, el.main);
  prepareBookmarks(OPTS, el.aside);
  makeVisible();

  // connect the add stuff
  document.addEventListener('keydown', detectKeydown);
  document.addEventListener('keyup', detectKeyup);
  el.editOk.addEventListener('click', editOk);
  el.editCancel.addEventListener('click', editCancel);
}

window.addEventListener('DOMContentLoaded', connectListeners);
