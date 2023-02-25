import { newUuid } from '../../lib/util.js';
import { makeRequest } from '../api.service.js';

/**
 * REQUIREMENTS FOR FIREBASE SERVICE
 *
 */

class FirebaseService {
  constructor(settings) {
    this.settings = settings;
  }

  get baseUrl() {
    return this.settings.baseUrl.replace(/\/$/, '');
  }

  // METHODS
  async getFullContent() {
    const result = await makeRequest(`${this.baseUrl}/${this.settings.getFullContentFunction}?userId=${this.settings.userId}`, 'GET');
    if (result.status === 404) return null;
    return result.content;
  }

  setFullContent(content) {
    return makeRequest(`${this.baseUrl}/${this.settings.setFullContentFunction}`, 'POST', {
      userId: this.settings.userId,
      content,
    });
  }

  async getPanel(id) {
    const response = await makeRequest(`${this.baseUrl}/${this.settings.getPanelFunction}?&id=${id}`, 'GET');
    if (response.status === 404) return null;
    return response.content.panel;
  }

  pushPanel(id, panel) {
    return makeRequest(`${this.baseUrl}/${this.settings.pushPanelFunction}`, 'POST', {
      id,
      content: {
        panel,
        owner: this.settings.userId,
      },
    });
  }

  deleteAllPanels() {
    return makeRequest(`${this.baseUrl}/${this.settings.deleteAllPanelsFunction}?owner=${this.settings.userId}`, 'DELETE');
  }
}

// TODO: Localization
export const register = () => {
  return {
    id: 'firebase',
    friendlyName: 'Firebase',
    Service: FirebaseService,
    settings: [
      {
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
        id: 'getFullContentFunction',
        friendlyName: 'Get Full Content Function',
        type: 'text',
        default: 'getContentByUser',
      },
      {
        id: 'setFullContentFunction',
        friendlyName: 'Set Full Content Function',
        type: 'text',
        default: 'pushContent',
      },
      {
        id: 'getPanelFunction',
        friendlyName: 'Get Panel Function',
        type: 'text',
        default: 'getPanel',
      },
      {
        id: 'pushPanelFunction',
        friendlyName: 'Push Panel Function',
        type: 'text',
        default: 'pushPanel',
      },
      {
        id: 'deleteAllPanelsFunction',
        friendlyName: 'Delete All Panels Function',
        type: 'text',
        default: 'deleteAllPanels',
      },
    ],
  };
};
