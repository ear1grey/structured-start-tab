import { OPTS } from './defaults.mjs';
import { loadOptionsWithPromise } from './options.mjs';
import { prepareBookmarks } from './bookmarks.mjs';

const el = {
  main: document.querySelector('main'),
  aside: document.querySelector('aside'),
};

// Accept an array of things that are either containers or links
// inject in the section template
// use the name
// stick in the links
//  if link has links - recurse
//  if link has no links - inject
function recuriveBuild(data, target = el.main, str = '') {
  // if it's an array, drill into it.
  if (Array.isArray(data)) {
    for (const x of data) {
      recuriveBuild(x, target, str);
    }
  }

  // if it's an object, check for an href
  // or if there is no href make a div
  if (data.href) {
    if (data.href === 'options') {
      // convert the word options into the options url
      data.href = chrome.extension.getURL('options.html');
    }

    // it's a link
    const a = document.createElement('a');
    a.href = data.href;
    a.textContent = data.name;
    target.appendChild(a);
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
        recuriveBuild(data.links, div, data.name ? str + OPTS.separator + data.name : str);
      }
    }
  }
}


function build(OPTS) {
  recuriveBuild(OPTS.configJSON);
}

function makeVisible() {
  el.main.classList.add('visible');
  el.aside.classList.add('visible');
}

async function connectListeners() {
  await loadOptionsWithPromise();
  build(OPTS);
  prepareBookmarks(OPTS, el.aside);
  makeVisible();
}

window.addEventListener('DOMContentLoaded', connectListeners);
