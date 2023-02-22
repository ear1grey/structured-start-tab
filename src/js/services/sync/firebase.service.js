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
}

// TODO: Localisation
export const register = () => {
  return {
    name: 'firebase',
    friendlyName: 'Firebase',
    Service: FirebaseService,
    settings: [
      {
        id: 'userId',
        friendlyName: 'User ID',
        type: 'text',
        default: newUuid(),
      },
      {
        id: 'getFullContentUrl',
        friendlyName: 'Get Full Content URL',
        type: 'text',
        default: 'https://localhost:3000/api/v1/firebase/get-full-content',
      },
      {
        id: 'setFullContentUrl',
        friendlyName: 'Set Full Content URL',
        type: 'text',
        default: 'https://localhost:3000/api/v1/firebase/set-full-content',
      },
    ],
  };
};
