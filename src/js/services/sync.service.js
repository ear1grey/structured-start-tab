import { services } from './sync/index.js';
import { OPTS, write } from '../lib/options.js';
import { jsonToDom } from './parser.service.js';
import { updateAgenda } from './agenda.service.js';

/**
 * Any provider requires the following implementations:
 *
 * - getFullContent()
 * - setFullContent(content)
 * - getPanel(id)
 * - pushPanel(id, panel)
 * - deleteAllPanels()
 *
 */

export const getAvailableServices = () => {
  // TODO: Validate services
  return services.map(serviceDetails => {
    return {
      id: serviceDetails.id,
      friendlyName: serviceDetails.friendlyName,
      settings: serviceDetails.settings,
      allowsPanelShare: serviceDetails.allowsPanelShare ?? false,
    };
  });
};

const getService = () => {
  return new (services.find(serviceDetails => {
    return serviceDetails.id === OPTS.sync.provider;
  })).Service(OPTS.sync.settings[OPTS.sync.provider]);
};

/**
 * Returns the stored full content of the page
 * @return {FullContent} The full content of the page
 */
export const getFullContent = async () => {
  try {
    return await getService().getFullContent();
  } catch (e) {
    console.error(e);
    return null;
  }
};

export const setFullContent = async content => {
  try {
    await getService().setFullContent(content);
    OPTS.sync.hasConflict = false;
    OPTS.sync.newChanges = false;
    write();
  } catch (e) {
    console.error(e);
  }
};

export const syncFullContent = async ({ window = null, ignoreConflict = false } = {}) => {
  if (!OPTS.sync.enabled || (OPTS.sync.hasConflict && !ignoreConflict)) return;

  const newPage = [];
  const remote = await getFullContent();

  if (remote == null) {
    await setFullContent({ version: 0, page: OPTS.json });
    return;
  }

  const options = {
    newChanges: OPTS.sync.newChanges,
    syncMode: OPTS.sync.mode,
    syncFold: OPTS.sync.syncFoldStatus,
    syncPrivate: OPTS.sync.syncPrivateStatus,
  };

  const conflictIdents = [];
  const updatedElements = [];
  buildResultingPage(remote.page, OPTS.json, options, newPage, conflictIdents, updatedElements);

  if (conflictIdents.length > 0) { // Show conflict page
    OPTS.sync.hasConflict = true;
    if (window) {
      OPTS.sync.conflictData = {
        remote: remote.page,
        remoteVersion: remote.version,
        conflictingElements: conflictIdents,
      };
      write();

      document.querySelector('#mergeConflictResolver').style.display = 'block';
    }
  } if (updatedElements.length > 0) { // Push changes
    await setFullContent({ version: 0, page: newPage });
    OPTS.json = newPage;
    write();

    if (window) {
      jsonToDom(window, OPTS.json);
      updateAgenda();
    }
  }
};

const elementBasePropertiesEqual = (localElement, remoteElement) => {
  const propertiesToIgnore = ['ident', 'id', 'content', 'grow'];

  // compare all the item properties dynamically
  for (const key in localElement) {
    if (propertiesToIgnore.includes(key)) continue;
    if (localElement[key] !== remoteElement[key]) {
      return false;
    }
  }

  return true;
};

const buildResultingPage = (
  remote, local, { newChanges = false, syncMode = 'manual', syncFold = true, syncPrivate = true } = {}, resultPage, conflictIdents, updatedElements) => {
  // clean-up content!!
  if (Array.isArray(local)) local = local.filter(elem => elem.id !== 'trash');
  if (Array.isArray(remote)) remote = remote.filter(elem => elem.id !== 'trash');

  // If they are both arrays, check all the elements
  if (Array.isArray(local) && Array.isArray(remote)) {
    // Go through all the elements of the incoming page
    for (const localElement of local) {
      const remoteElementIndex = remote.findIndex(elem => elem.ident === localElement.ident);
      const remoteElement = remoteElementIndex !== -1 ? remote[remoteElementIndex] : null;

      if (!remoteElement) { // Remote element not found
        if (newChanges) { // User added a new element
          if (syncMode.includes('Push')) { // Push element creation
            resultPage.push(localElement);
            updatedElements.push(localElement);
          } else { // Not allowed to push element creation
            conflictIdents.push(localElement.ident);
          }
        } else { // User deleted an element from another device
          if (syncMode === 'hardPull') { // Pull element deletions
            updatedElements.push(localElement);
          } else { // Not allowed to pull element deletion
            conflictIdents.push(localElement.ident);
          }
        }
      } else { // Remote element found
        remote.splice(remoteElementIndex, 1);

        // Check if the panel properties are different
        if (!elementBasePropertiesEqual(localElement, remoteElement, { syncFold, syncPrivate })) {
          conflictIdents.push(localElement.ident);
        }

        const newElement = { ...remoteElement };
        if (newElement.content) newElement.content = []; // Don't automatically add the content already present
        if (localElement.content) {
          const contentConflictIdents = [];
          buildResultingPage(remoteElement.content, localElement.content, { newChanges, syncMode, syncFold, syncPrivate }, newElement.content, contentConflictIdents, updatedElements);
          if (contentConflictIdents.length > 0) {
            for (const contentConflictIdent of contentConflictIdents) {
              conflictIdents.push(contentConflictIdent);
            }
          }
        }
        resultPage.push(newElement);
      }
    }

    // Elements that are left in the remote but are not present in the local
    if (remote.length > 0) { // Local elements not found
      if (newChanges) { // User made changes
        if (syncMode === 'hardPush') { // Push element deletions
          updatedElements.push(...remote);
        } else { // Not allow to push element deletion
          const ids = remote.map(elem => elem.ident);
          conflictIdents.push(...ids);
        }
      } else { // User deleted an element from another device
        if (syncMode.includes('Pull')) { // Pull element creation from another device
          resultPage.push(...remote);
          updatedElements.push(...remote);
        } else { // Not allowed to pull element creation from another device
          const ids = remote.map(elem => elem.ident);
          conflictIdents.push(...ids);
        }
      }
    }
  } else { // If they are not both arrays, check the base properties
    if (!elementBasePropertiesEqual(local, remote, { syncFold, syncPrivate })) {
      conflictIdents.push(local.ident);
    }
    if (local.content) {
      const contentConflictIdents = [];
      buildResultingPage(remote.content, local.content, { syncMode, syncFold, syncPrivate }, resultPage);
      if (contentConflictIdents.length > 0) {
        for (const contentConflictIdent of contentConflictIdents) {
          conflictIdents.push(contentConflictIdent);
        }
      }
    }
    resultPage.push(remote);
  }
};

// PANELS SHARE METHODS
export const getPanel = (id) => {
  return getService().getPanel(id);
};

export const pushPanel = (id, panel) => {
  return getService().pushPanel(id, panel);
};

export const deleteAllPanels = () => {
  return getService().deleteAllPanels();
};

export const panelShareAvailable = () => {
  const service = getService();
  return service &&
    typeof service.getPanel === 'function' &&
    typeof service.pushPanel === 'function' &&
    typeof service.deleteAllPanels === 'function';
};
