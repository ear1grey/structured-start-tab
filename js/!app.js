import { doNotFollowDisabledLinks, prepareClickables } from './util.mjs';

import { OPTS } from './defaults.mjs';
import { loadOptionsWithPromise } from './options.mjs';
import { prepareBookmarks } from './bookmarks.mjs';

const EXTENSION = window.chrome && chrome.runtime && chrome.runtime.id;

const el = {
  main: document.querySelector('main'),
  aside: document.querySelector('aside'),
};

function listenForStorageChanges() {
  chrome.storage.onChanged.addListener((changes) => {
    for (const key in changes) {
      hist = JSON.parse(changes[key].newValue);
    }
  });
}

let index = {};

function cleanIndex() {
  const cleanerIndex = {};
  Object.keys(index).forEach(
    (key, x) => {
      cleanerIndex[key.slice(3)] = index[key].toLowerCase();
    },
  );
  index = cleanerIndex;
}



async function loadAvoidingCORS(path) {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('GET', path, true);
    request.responseType = 'blob';

    request.onload = () => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(request.response);
    };

    request.send();
  });
}

// Accept an array of things that are either containers or links
// inject in the section template
// use the name
// stick in the links
//  if link has links - recurse
//  if link has no links - inject
async function build(data, target = el.main, str = '') {
  // if it's an array, drill into it.
  if (Array.isArray(data)) {
    for (const x of data) {
      build(x, target, str);
    }
  }

  // if it's an object, check for an href
  // or if there is no href make a div
  if (data.href) {
    // it's a link
    const a = document.createElement('a');
    a.href = data.href;
    a.textContent = data.name;
    target.appendChild(a);

    if (a.href) {
      index[str + OPTS.separator + data.name] = a.href;
    }
  } else if (data.name) {
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
      build(data.links, div, data.name ? str + OPTS.separator + data.name : str);
    }
  }
}


async function buildFromData(fn) {
  let data;
  try {
    data = OPTS.configJSON;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.errpr('Error loading: ', fn);
    data = [{ name: 'oops', links: [] }];
  }

  build(data);
  return data;
}


async function connectListeners() {
  const o = await loadOptionsWithPromise();
  // const sourceFile = chrome.runtime.getURL(o.sourceFile);
  const data = await buildFromData(o.sourceFile);

  await prepareBookmarks(OPTS);

  cleanIndex();
  if (EXTENSION) listenForStorageChanges();

  prepareClickables();

  const alllinks = document.querySelectorAll('a[href]');
  for (const link of alllinks) {
    link.addEventListener('click', (e) => {
      hist[e.target.href] = (hist[e.target.href] || 0) + 1;
    });
  }

  window.document.addEventListener('click', doNotFollowDisabledLinks);

  el.main.classList.add('visible');
  el.aside.classList.add('visible');
}

window.addEventListener('DOMContentLoaded', connectListeners);

