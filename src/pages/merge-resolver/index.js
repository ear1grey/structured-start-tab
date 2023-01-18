import { OPTS } from '../../js/lib/options.js';
import * as options from '../../js/lib/options.js';
import { jsonToDom, domToJson } from '../../js/services/parser.service.js';
import '../../js/components/panel/index.js';
import { prepareCSSVariables, addSpinner } from '../../js/lib/util.js';
import { prepareDrag } from '../../js/services/drag.service.js';
import { prepareFoldables } from '../../js/index.js';
import { savePageCloud } from '../../js/services/cloud.service.js';

let els;

const prepareElements = async () => {
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
  jsonToDom(els.right, [...OPTS.onlineJson]);
};

const disableAllButtons = () => {
  document.querySelectorAll('button').forEach((button) => {
    button.disabled = true;
  });
};

const save = async (pick) => {
  // TODO: Add loading animation whilst loading

  if (pick === 'left') {
    OPTS.json = domToJson(els.left);
  } else if (pick === 'right') {
    OPTS.json = domToJson(els.right);
  }

  OPTS.contentVersion = OPTS.onlineVersion + 1;

  await savePageCloud(OPTS.json);

  OPTS.onlineJson = null;
  OPTS.onlineVersion = null;
  OPTS.hasMergeConflict = false;

  options.write();
};

window.addEventListener('DOMContentLoaded', prepareElements);
