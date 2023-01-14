import { makeRequest } from './api.service.js';
import { OPTS } from '../lib/options.js';

export const getPageCloud = async () => {
  const identifier = (await chrome.identity.getProfileUserInfo()).id;
  const url = `${OPTS.storageUrl}/getSettings?id=${identifier}`;

  const response = await makeRequest(url, 'GET');

  // If there are no settings available yet, don't load
  if ((response.status === 404 && response.content?.error) || response.status === 204) {
    return;
  }

  OPTS.onlineVersion = response.content.version + 1;

  return JSON.parse(response.content.settings);
};

export const savePageCloud = async (object) => {
  const url = `${OPTS.storageUrl}/saveSettings`;

  const identifier = (await chrome.identity.getProfileUserInfo()).id;

  const body = {
    id: identifier,
    content: { settings: JSON.stringify(object), version: OPTS.onlineVersion },
  };

  return await makeRequest(url, 'POST', body);
};
