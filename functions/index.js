import functions from 'firebase-functions';
import admin from 'firebase-admin';

import * as sync from './src/sync.js';
import * as share from './src/share.js';
import * as base from './src/base.js';
import * as storage from './src/storage.js';

admin.initializeApp();

// Sync page
export const getPage = functions.https.onRequest(sync.getPage);
export const savePage = functions.https.onRequest(sync.savePage);
export const syncPage = functions.https.onRequest(sync.syncPage);

// Share panel
export const getAllPanels = functions.https.onRequest(share.getAllPanels);
export const getPanel = functions.https.onRequest(share.getPanel);
export const sharePanel = functions.https.onRequest(share.sharePanel);
export const deleteAllSharedPanels = functions.https.onRequest(share.deleteAllPanels);

// Base
export const getFullContent = functions.https.onRequest(base.getFullContent);
export const setFullContent = functions.https.onRequest(base.setFullContent);

// Storage (V2)
export const getContentByUser = functions.https.onRequest(storage.getContentByUser);
export const pushContent = functions.https.onRequest(storage.pushContent);
