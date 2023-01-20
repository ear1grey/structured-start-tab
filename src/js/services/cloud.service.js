import { makeRequest } from './api.service.js';
import { OPTS, write } from '../lib/options.js';
import { isContentEqual } from '../lib/util.js';

export const getPageCloud = async () => {
  const identifier = (await chrome.identity.getProfileUserInfo()).id;
  const url = `${OPTS.storageUrl}/getSettings?id=${identifier}`;

  const response = await makeRequest(url, 'GET');

  // If there are no settings available yet, don't load
  if ((response.status === 404 && response.content?.error) || response.status === 204) {
    return;
  }

  return [response.content.settings, response.content.version];
};

export const savePageCloud = async (object) => {
  const url = `${OPTS.storageUrl}/saveSettings`;

  const identifier = (await chrome.identity.getProfileUserInfo()).id;

  const body = {
    id: identifier,
    content: {
      settings: JSON.stringify(
        object
          .filter(panel => panel.id !== 'trash')), // make sure to exclude the trash panel
      version: OPTS.contentVersion,
    },
  };

  return await makeRequest(url, 'POST', body);
};

export const syncPageCloud = async () => {
  // TODO: this should be a parameter of the function
  const idsToIgnore = ['trash'];

  if (OPTS.hasMergeConflict) return;

  if (OPTS.json == null || OPTS.json.length === 0) {
    console.warn('No settings to save');
    return;
  }

  const url = `${OPTS.storageUrl}/syncSettings`;

  const identifier = (await chrome.identity.getProfileUserInfo()).id;

  const body = {
    id: identifier,
    content: {
      settings: JSON.stringify(
        OPTS.json
          .filter(panel => !idsToIgnore.includes(panel.id))), // make sure to exclude the trash panel
      version: OPTS.contentVersion,
    },
  };

  console.warn('Saving page cloud (check quota!)');
  const response = await makeRequest(url, 'POST', body);
  const { version, settings } = response.content;
  if (version == null) return;

  if (response.status === 409) { // Possible merge conflict
    if (!settings) return;
    const isEqual = isContentEqual(JSON.parse(settings), OPTS.json);

    if (!isEqual) {
      OPTS.hasMergeConflict = true;
    }
  }

  OPTS.contentVersion = version + 1;
  write();
};
