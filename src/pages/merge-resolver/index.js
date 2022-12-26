import { OPTS } from '../../js/lib/options.js';
import * as options from '../../js/lib/options.js';
import { jsonToDom, domToJson } from '../../js/services/parser.service.js';
import '../../js/components/panel/index.js';
import { prepareCSSVariables } from '../../js/lib/util.js';
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

  document.querySelector('#pick-your').addEventListener('click', async () => {
    await save('left');
    window.location.href = '/src/index.html';
  });

  document.querySelector('#pick-incoming').addEventListener('click', async () => {
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

const save = async (pick) => {
  // TODO: Add loading animation whilst loading

  if (pick === 'left') {
    OPTS.json = domToJson(els.left);
  } else if (pick === 'right') {
    OPTS.json = domToJson(els.right);
  }
  OPTS.onlineJson = null;

  await savePageCloud(OPTS.json);

  // TODO: after picking version we need to update the cloud version

  options.write();
};

window.addEventListener('DOMContentLoaded', prepareElements);
