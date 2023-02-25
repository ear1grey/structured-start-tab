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

  // METHODS
  async getFullContent() {
    const result = await makeRequest(`${this.settings.getFullContentUrl}?userId=${this.settings.userId}`, 'GET');
    if (result.status === 404) return null;
    return result.content;
  }

  setFullContent(content) {
    return makeRequest(this.settings.setFullContentUrl, 'POST', {
      userId: this.settings.userId,
      content,
    });
  }

  async getPanel(id) {
    const response = await makeRequest(`${this.settings.getPanelUrl}?&id=${id}`, 'GET');
    if (response.status === 404) return null;
    return response.content.panel;
  }

  pushPanel(id, panel) {
    return makeRequest(this.settings.pushPanelUrl, 'POST', {
      id,
      content: {
        panel,
        owner: this.settings.userId,
      },
    });
  }

  deleteAllPanels() {
    return makeRequest(`${this.settings.deleteAllPanelsUrl}?owner=${this.settings.userId}`, 'DELETE');
  }
}

// TODO: Localisation
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
        id: 'getFullContentUrl',
        friendlyName: 'Get Full Content URL',
        type: 'text',
        default: 'https://example.come/getContentByUser',
      },
      {
        id: 'setFullContentUrl',
        friendlyName: 'Set Full Content URL',
        type: 'text',
        default: 'https://example.come/pushContent',
      },
      {
        id: 'getPanelUrl',
        friendlyName: 'Get Panel URL',
        type: 'text',
        default: 'https://example.come/set-full-content',
      },
      {
        id: 'pushPanelUrl',
        friendlyName: 'Push Panel URL',
        type: 'text',
        default: 'https://example.come/set-full-content',
      },
      {
        id: 'deleteAllPanelsUrl',
        friendlyName: 'Delete All Panels URL',
        type: 'text',
        default: 'https://example.come/set-full-content',
      },
    ],
  };
};
