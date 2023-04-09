import { services } from './sync/index.js';
import { OPTS, write } from '../lib/options.js';
import { jsonToDom } from './parser.service.js';
import { updateAgenda } from './agenda.service.js';
import { areObjectEquals, addLinkListeners } from '../lib/util.js';

/**
 * Any provider requires the following implementations:
 *
 * REQUIRED:
 * - getFullContent()
 * - setFullContent(content)
 * - getPanel(id)
 * - pushPanel(id, panel)
 * - deleteAllPanels()
 *
 * OPTIONAL:
 * - getPanels([id])
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
  } else {
    OPTS.sync.hasConflict = false;
    write();
  }

  if (updatedElements.length > 0) { // Push changes
    await setFullContent({ version: 0, page: newPage });
    OPTS.json = newPage;
    write();

    if (window) {
      jsonToDom(window, OPTS.json);
      updateAgenda();
    }
  }

  updateSubscriptions({ window });
};

const elementBasePropertiesEqual = (localElement, remoteElement, additionalPropsToIgnore = []) => {
  return elementPropertiesEqual(localElement, remoteElement, ['content', ...additionalPropsToIgnore]);
};

const elementPropertiesEqual = (localElement, remoteElement, additionalPropsToIgnore = []) => {
  const propertiesToIgnore = ['ident', 'id', 'grow', ...additionalPropsToIgnore];
  return areObjectEquals(localElement, remoteElement, propertiesToIgnore);
};

const buildResultingPage = (
  remote, local, { newChanges = false, syncMode = 'manual', syncFold = true, syncPrivate = true } = {}, resultPage, conflictIdents, updatedElements) => {
  // clean-up content!!
  // if (Array.isArray(local)) local = local.filter(elem => elem.id !== 'trash' && elem.remotePanelId == null);
  // if (Array.isArray(remote)) remote = remote.filter(elem => elem.id !== 'trash' && elem.remotePanelId == null);
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
        if (!elementBasePropertiesEqual(localElement, remoteElement)) {
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
    if (!elementBasePropertiesEqual(local, remote)) {
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

// PANEL SUBSCRIPTIONS METHODS
const updateSubscriptions = async ({ window = null } = {}) => {
  const allIds = getSubscriptionIds(OPTS.json);

  let remotePanels = [];
  if (supportsMultiplePanelsGet()) {
    remotePanels.push(...getService().getPanels(allIds));
  } else {
    for (const id of allIds) {
      remotePanels.push(await getService().getPanel(id));
    }
  }
  // Create dictionary of remote panels
  remotePanels = remotePanels.reduce((acc, panel) => {
    acc[panel.ident] = panel;
    return acc;
  }, {});

  if (updatePanelSubscriptionContent(OPTS.json, remotePanels) && window) {
    jsonToDom(window, OPTS.json);
    addLinkListeners(window);
    updateAgenda();
  }

  write();
};

const getSubscriptionIds = (content) => {
  const subscriptionIds = [];

  for (const element of content) {
    if (content.id === 'trash') continue;
    if (element.remotePanelId != null && element.remotePanelId !== '') {
      subscriptionIds.push(element.remotePanelId);
    } else if (element.content) {
      subscriptionIds.push(...getSubscriptionIds(element.content));
    }
  }
  return subscriptionIds.filter((id, index) => subscriptionIds.indexOf(id) === index);
};

const updatePanelSubscriptionContent = (content, panels) => {
  let contentUpdated = false;

  for (let i = 0; i < content.length; i++) {
    if (content[i].id === 'trash') continue;
    if (content[i].remotePanelId != null && content[i].remotePanelId !== '' &&
    !elementPropertiesEqual(content[i], panels[content[i].remotePanelId], ['remotePanelId'])) {
      const panelIdent = content[i].ident;
      content[i] = panels[content[i].remotePanelId];
      content[i].remotePanelId = content[i].ident;
      content[i].ident = panelIdent;

      contentUpdated = true;
    } else if (content[i].content) {
      contentUpdated = contentUpdated || updatePanelSubscriptionContent(content[i].content, panels);
    }
  }

  return contentUpdated;
};

// INFORMATION METHODS
export const panelShareAvailable = () => {
  const service = getService();
  return service &&
    typeof service.getPanel === 'function' &&
    typeof service.pushPanel === 'function' &&
    typeof service.deleteAllPanels === 'function';
};

const supportsMultiplePanelsGet = () => {
  const service = getService();
  return service &&
    typeof service.getPanels === 'function';
};
