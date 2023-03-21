import functions from 'firebase-functions';
import admin from 'firebase-admin';


import * as storage from './src/storage.js';

admin.initializeApp();

// Storage
export const getContentByUser = functions.https.onRequest(storage.getContentByUser);
export const pushContent = functions.https.onRequest(storage.pushContent);
export const getPanel = functions.https.onRequest(storage.getPanel);
export const pushPanel = functions.https.onRequest(storage.pushPanel);
export const deleteAllPanels = functions.https.onRequest(storage.deleteAllPanels);
