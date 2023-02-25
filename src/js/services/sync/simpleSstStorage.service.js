import { newUuid } from '../../lib/util.js';
import { makeRequest } from '../api.service.js';

class SimpleSstStorageService {
  constructor(settings) {
    this.settings = settings;
  }

  get baseUrl() {
    return this.settings.baseUrl.replace(/\/$/, '');
  }

  // METHODS
  async getFullContent() {
    const result = await makeRequest(`${this.baseUrl}?userId=${this.settings.userId}`, 'GET', null, { Authorization: this.settings.token });
    if (result.status < 200 || result.status >= 300) return null;
    return result.content;
  }

  setFullContent(content) {
    return makeRequest(`${this.baseUrl}`, 'POST', {
      userId: this.settings.userId,
      content,
    }, { Authorization: this.settings.token });
  }

  async getPanel(id) {
    const response = await makeRequest(`${this.baseUrl}/panel?&panelId=${id}`, 'GET', null, { Authorization: this.settings.token });
    if (response.status === 404) return null;
    return response.content.panel;
  }

  pushPanel(id, panel) {
    return makeRequest(`${this.baseUrl}/panel`, 'POST', {
      panelId: id,
      content: {
        panel,
        owner: this.settings.userId,
      },
    }, { Authorization: this.settings.token });
  }

  deleteAllPanels() {
    return makeRequest(`${this.baseUrl}/panels?owner=${this.settings.userId}`, 'DELETE', null, { Authorization: this.settings.token });
  }
}

// TODO: Localization
export const register = () => {
  return {
    id: 'simpleSstStorage',
    friendlyName: 'Simple SST Storage',
    Service: SimpleSstStorageService,
    settings: [
      {
        // TODO: Validation - it cannot have slashes
        id: 'userId',
        friendlyName: 'User ID',
        type: 'text',
        default: newUuid(),
        customActions: [
          {
            event: 'click',
            handler: () => {
              alert(chrome.i18n.getMessage('sync_warn_id_change'));
            },
          },
        ],
      },
      {
        id: 'baseUrl',
        friendlyName: 'Base URL',
        type: 'text',
        default: 'https://example.com/',
      },
      {
        id: 'token',
        friendlyName: 'Token',
        type: 'text',
        default: '',
      },
    ],
  };
};
