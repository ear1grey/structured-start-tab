import { makeRequest } from './api.service.js';

const storageUrl = 'http://127.0.0.1:5001/structured-start-tab-68c48/us-central1';

export const getPageCloud = async () => {
  const identifier = (await chrome.identity.getProfileUserInfo()).id;
  const url = `${storageUrl}/getSettings?id=${identifier}`;

  return JSON.parse((await makeRequest(url, 'GET')).content);
};

export const savePageCloud = async (object) => {
  const url = `${storageUrl}/saveSettings`;

  const identifier = (await chrome.identity.getProfileUserInfo()).id;

  const body = {
    id: identifier,
    settings: { content: JSON.stringify(object) }, // { pageContent: object },
  };

  return await makeRequest(url, 'POST', body);
};
