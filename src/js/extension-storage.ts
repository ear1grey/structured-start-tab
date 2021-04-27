import { LocalStorage } from './storage-module/local-storage.js';

export interface ApiStorage {
  load() :Promise<void>
  write(): Promise<void>
}

export class ExtensionStorage {
  static accessor: ApiStorage = new LocalStorage();
  static setAccesor(name: string): void {
    switch (name) {
      // The different type of storage
      // By default localStorage
      default:
        ExtensionStorage.accessor = new LocalStorage();
        break;
    }
  }
}
