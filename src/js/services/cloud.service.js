import { OPTS, write } from '../lib/options.js';
import { makeRequest } from './api.service.js';
import { jsonToDom } from './parser.service.js';

export const savePageCloud = async (object) => {
  const url = `${OPTS.cloud.url}/savePage`;

  const body = {
    id: OPTS.cloud.userId,
    content: {
      page: JSON.stringify(
        object
          .filter(panel => panel.id !== 'trash')), // make sure to exclude the trash panel
      version: OPTS.cloud.version,
    },
  };

  return await makeRequest(url, 'POST', body);
};

export const syncPageCloud = async ({ window = null, ignoreConflict = false } = {}) => {
  if (!OPTS.cloud.enabled || (OPTS.cloud.hasConflict && !ignoreConflict)) return;

  if (OPTS.json == null || OPTS.json.length === 0) {
    console.warn('No page to save');
    return;
  }

  // TODO: this should be a parameter of the function
  const idsToIgnore = ['trash'];
  const url = `${OPTS.cloud.url}/syncPage`;

  const body = {
    id: OPTS.cloud.userId,
    content: {
      page: JSON.stringify(
        OPTS.json
          .filter(panel => !idsToIgnore.includes(panel.id))), // make sure to exclude the trash panel
      version: OPTS.cloud.version,
      options: {
        newChanges: OPTS.cloud.newChanges,
        syncMode: OPTS.cloud.syncMode,
        syncFold: OPTS.cloud.syncFoldStatus,
        syncPrivate: OPTS.cloud.syncPrivateStatus,
      },
    },
  };

  console.warn('Saving page cloud (check quota!)');
  const response = await makeRequest(url, 'POST', body);

  switch (response.status) {
    case 200:
      OPTS.cloud.version = response.content.version;
      OPTS.cloud.hasConflict = false;
      OPTS.cloud.newChanges = false;
      break;
    case 201:
      OPTS.cloud.version = response.content.version;
      OPTS.cloud.hasConflict = false;
      OPTS.cloud.newChanges = false;
      OPTS.json = JSON.parse(response.content.cloudPage);
      jsonToDom(window, OPTS.json);
      break;
    case 409:
      OPTS.cloud.hasConflict = true;
      if (window) {
        OPTS.cloud.conflictData = {
          cloudJson: JSON.parse(response.content.cloudPage),
          cloudPageVersion: response.content.version,
          conflictingElements: response.content.conflicts,
        };

        document.querySelector('#mergeConflictResolver').style.display = 'block';
      }

      break;
    default: console.warn('Unknown response', response);
  }

  write();
};

export const getPanelCloud = async (panelId) => {
  const url = `${OPTS.cloud.url}/getPanel?id=${panelId}`;
  const response = await makeRequest(url, 'GET');

  // If there is no panel available yet, don't load
  if ((response.status === 404 && response.content?.error) || response.status === 204) {
    return;
  }

  return response.content.panel;
};

export const sharePanelCloud = (panelId, panel) => {
  const url = `${OPTS.cloud.url}/sharePanel`;

  const body = {
    id: panelId,
    content: {
      owner: OPTS.cloud.userId,
      panel,
    },
  };

  return makeRequest(url, 'POST', body);
};

export const deleteAllSharedPanels = () => {
  const url = `${OPTS.cloud.url}/deleteAllSharedPanels?owner=${OPTS.cloud.userId}`;
  return makeRequest(url, 'DELETE');
};
