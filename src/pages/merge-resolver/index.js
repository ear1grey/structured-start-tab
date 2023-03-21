import { OPTS } from '../../js/lib/options.js';
import * as options from '../../js/lib/options.js';
import { jsonToDom, domToJson } from '../../js/services/parser.service.js';
import { loadPanelDefinition } from '../../js/components/panel/index.js';
import { prepareCSSVariables, addSpinner, getAllBySelector } from '../../js/lib/util.js';
import { prepareDrag } from '../../js/services/drag.service.js';
import { prepareFoldables } from '../../js/index.js';
import { setFullContent } from '../../js/services/sync.service.js';

let els;
const allElements = [];

const prepareElements = async () => {
  await loadPanelDefinition();
  await options.load();
  prepareCSSVariables(OPTS);
  prepareDrag();
  prepareFoldables();

  document.querySelector('#return').addEventListener('click', () => {
    window.location.href = '/src/index.html';
  });

  document.querySelector('#pick-your').addEventListener('click', async (e) => {
    addSpinner(e.target);
    disableAllButtons();
    await save('left');
    window.location.href = '/src/index.html';
  });

  document.querySelector('#pick-incoming').addEventListener('click', async (e) => {
    addSpinner(e.target);
    disableAllButtons();
    await save('right');
    window.location.href = '/src/index.html';
  });

  els = {
    left: document.querySelector('#left'),
    right: document.querySelector('#right'),
  };

  jsonToDom(els.left, [...OPTS.json]);
  jsonToDom(els.right, [...OPTS.sync.conflictData.remote]);

  // Highlight conflicting elements
  allElements.push(...getAllBySelector(els.left, '[ident]'));
  allElements.push(...getAllBySelector(els.right, '[ident]'));
  allElements.forEach((element) => {
    const ident = element.ident || element.getAttribute('ident');
    const newBackgroundColour = OPTS.sync.conflictData.conflictingElements.includes(ident) ? '#db3939b8' : '#60606050';

    if (element.tagName === 'A') {
      element.setAttribute('originalBackground', element.style.backgroundColor);
      element.style.backgroundColor = newBackgroundColour;
    } else if (element.tagName === 'SST-PANEL') {
      element.tempBackgroundColour = newBackgroundColour;
    }
  });

  // Sync scrolls
  els.left.addEventListener('scroll', () => {
    els.right.scrollTop = els.left.scrollTop;
  });
  els.right.addEventListener('scroll', () => {
    els.left.scrollTop = els.right.scrollTop;
  });
};

const disableAllButtons = () => {
  document.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
  });
};

const save = async (pick) => {
  allElements.forEach((element) => {
    if (element.tagName === 'A') {
      element.style.backgroundColor = element.getAttribute('originalBackground');
    } else if (element.tagName === 'SST-PANEL') {
      element.removeTemps();
    }
  });

  OPTS.json = domToJson(pick === 'left' ? els.left : els.right);
  OPTS.sync.version = OPTS.onlinePageVersion + 1;

  await setFullContent({ version: OPTS.sync.version, page: OPTS.json });

  delete OPTS.sync.conflictData;
  OPTS.sync.hasConflict = false;

  options.write();
};

window.addEventListener('DOMContentLoaded', prepareElements);
