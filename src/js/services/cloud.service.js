import { OPTS, write } from '../lib/options.js';

import { makeRequest } from './api.service.js';

export const getPageCloud = async () => {
  const url = `${OPTS.cloud.url}/getPage?id=${OPTS.cloud.userId}`;

  const response = await makeRequest(url, 'GET');

  // If there is no page available yet, don't load
  if ((response.status === 404 && response.content?.error) || response.status === 204) {
    return;
  }

  return [response.content.page, response.content.version];
};

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

export const syncPageCloud = async (showMergeResolution = false) => {
  if (!OPTS.cloud.enabled || OPTS.cloud.hasConflict) return;

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
        autoAdd: OPTS.cloud.autoAdd,
        syncFold: OPTS.cloud.syncFoldStatus,
        syncPrivate: OPTS.cloud.syncPrivateStatus,
      },
    },
  };

  console.warn('Saving page cloud (check quota!)');
  const response = await makeRequest(url, 'POST', body);

  switch (response.status) {
    case 200:
    case 201:
      OPTS.cloud.version = response.content.version;
      break;
    case 409:
      OPTS.cloud.hasConflict = true;

      if (showMergeResolution) {
        OPTS.onlineJson = JSON.parse(response.content.page);
        OPTS.onlinePageVersion = response.content.version;
        write();
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
