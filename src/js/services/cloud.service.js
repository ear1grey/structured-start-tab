import { makeRequest } from './api.service.js';
import { OPTS, write } from '../lib/options.js';

export const getPageCloud = async () => {
  const identifier = (await chrome.identity.getProfileUserInfo()).id;
  const url = `${OPTS.cloud.url}/getPage?id=${identifier}`;

  const response = await makeRequest(url, 'GET');

  // If there is no page available yet, don't load
  if ((response.status === 404 && response.content?.error) || response.status === 204) {
    return;
  }

  return [response.content.page, response.content.version];
};

export const savePageCloud = async (object) => {
  const url = `${OPTS.cloud.url}/savePage`;

  const identifier = (await chrome.identity.getProfileUserInfo()).id;

  const body = {
    id: identifier,
    content: {
      page: JSON.stringify(
        object
          .filter(panel => panel.id !== 'trash')), // make sure to exclude the trash panel
      version: OPTS.cloud.version,
    },
  };

  return await makeRequest(url, 'POST', body);
};

export const syncPageCloud = async () => {
  if (OPTS.cloud.hasConflict) return;

  if (OPTS.json == null || OPTS.json.length === 0) {
    console.warn('No page to save');
    return;
  }

  // TODO: this should be a parameter of the function
  const idsToIgnore = ['trash'];
  const url = `${OPTS.cloud.url}/syncPage`;
  const identifier = (await chrome.identity.getProfileUserInfo()).id;

  const body = {
    id: identifier,
    content: {
      page: JSON.stringify(
        OPTS.json
          .filter(panel => !idsToIgnore.includes(panel.id))), // make sure to exclude the trash panel
      version: OPTS.cloud.version,
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
      break;
    default: console.warn('Unknown response', response);
  }

  write();
};
