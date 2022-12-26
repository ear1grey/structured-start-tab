import { makeRequest } from './api.service.js';
import { OPTS } from '../lib/options.js';

const storageUrl = 'http://127.0.0.1:5001/structured-start-tab-68c48/us-central1';

export const getPageCloud = async () => {
  const identifier = (await chrome.identity.getProfileUserInfo()).id;
  const url = `${storageUrl}/getSettings?id=${identifier}`;

  const response = await makeRequest(url, 'GET');

  // If there are no settings available yet, don't load
  if ((response.status === 404 && response.content?.error) || response.status === 204) {
    return;
  }

  OPTS.onlineVersion = response.content.version + 1;

  return JSON.parse(response.content.settings);
};

export const savePageCloud = async (object) => {
  const url = `${storageUrl}/saveSettings`;

  const identifier = (await chrome.identity.getProfileUserInfo()).id;

  const body = {
    id: identifier,
    content: { settings: JSON.stringify(object), version: OPTS.onlineVersion },
  };

  return await makeRequest(url, 'POST', body);
};
