import { register as firebaseRegister } from './firebase.service.js';
import { register as simpleSstStorageRegister } from './simpleSstStorage.service.js';

export const services = [
  firebaseRegister(),
  simpleSstStorageRegister(),
];
