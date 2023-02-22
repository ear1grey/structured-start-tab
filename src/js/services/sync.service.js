import { services } from './sync/index.js';
import { OPTS } from '../lib/options.js';

export const getAvailableServices = () => {
  // TODO: Validate services
  return services.map(serviceDetails => {
    return {
      id: serviceDetails.name,
      friendlyName: serviceDetails.friendlyName,
      settings: serviceDetails.settings,
    };
  });
};

const getService = () => {
  return new (services.find(serviceDetails => {
    return serviceDetails.name === OPTS.sync.provider;
  })).Service(OPTS.sync.settings[OPTS.sync.provider]);
};

/**
 * Returns the stored full content of the page
 * @return {FullContent} The full content of the page
 */
export const getFullContent = () => {
  return getService().getFullContent();
};

export const setFullContent = content => {
  return getService().setFullContent(content);
};

export const syncFullContent = async ({ local, options }) => {
  const newPage = [];
  const remote = await getFullContent();

  if (remote == null) {
    setFullContent({ version: 0, page: local });
    return;
  }

  const conflictIdents = [];
  const updatedElements = [];
  buildResultingPage(remote.page, local, options, newPage, conflictIdents, updatedElements);

  // TODO: load settings OR handle merge conflicts
};

const elementBasePropertiesEqual = (localElement, remoteElement) => {
  const propertiesToIgnore = ['ident', 'id', 'content'];

  // compare all the item properties dynamically
  for (const key in localElement) {
    if (propertiesToIgnore.includes(key)) continue;
    if (localElement[key] !== remoteElement[key]) {
      return false;
    }
  }

  return true;


  // return localElement.backgroundColour === remoteElement.backgroundColour &&
  //   localElement.textColour === remoteElement.textColour &&
  //   localElement.type === remoteElement.type &&
  //   localElement.fontSize === remoteElement.fontSize &&

  //   // panel only properties
  //   localElement.direction === remoteElement.direction &&
  //   localElement.header === remoteElement.header &&
  //   localElement.id === remoteElement.id &&
  //   localElement.singleLineDisplay === remoteElement.singleLineDisplay &&
  //   localElement.textColour === remoteElement.textColour &&
  //   localElement.type === remoteElement.type &&
  //   localElement.textMode === remoteElement.textMode &&
  //   localElement.padding === remoteElement.padding &&
  //   localElement.borderSize === remoteElement.borderSize &&
  //   localElement.borderColour === remoteElement.borderColour &&
  //   // optional panel properties
  //   localElement.folded === remoteElement.folded &&
  //   localElement.private === remoteElement.private &&
  //   // link only properties
  //   localElement.name === remoteElement.name &&
  //   localElement.url === remoteElement.url &&
  //   localElement.iconSize === remoteElement.iconSize;
};

const buildResultingPage = (
  remote, local, { newChanges = false, syncMode = 'manual', syncFold = true, syncPrivate = true } = {}, resultPage, conflictIdents, updatedElements) => {
  // clean-up content!!
  if (Array.isArray(local)) local = local.filter(elem => elem.id !== 'trash');
  if (Array.isArray(remote)) remote = remote.filter(elem => elem.id !== 'trash');

  // If they are both arrays, check all the elements
  if (Array.isArray(local) && Array.isArray(remote)) {
    // Go through all the elements of the incoming page
    for (const incomingElement of local) {
      const cloudElementIndex = remote.findIndex(elem => elem.ident === incomingElement.ident);
      const cloudElement = cloudElementIndex !== -1 ? remote[cloudElementIndex] : null;

      if (!cloudElement) { // Cloud element not found
        if ((!newChanges && syncMode === 'autoAdd') || syncMode === 'manual') {
          conflictIdents.push(incomingElement.ident);
        } else if (!newChanges && syncMode === 'autoDelete') {
          updatedElements.push(incomingElement);
          continue;
        } else {
          resultPage.push(incomingElement);
          updatedElements.push(incomingElement);
        }
      } else { // Cloud element found
        remote.splice(cloudElementIndex, 1);

        // Check if the panel properties are different
        if (!elementBasePropertiesEqual(incomingElement, cloudElement, { syncFold, syncPrivate })) {
          conflictIdents.push(incomingElement.ident);
        }

        const newElement = { ...cloudElement };
        if (newElement.content) newElement.content = []; // Don't automatically add the content already present
        if (incomingElement.content) {
          const contentConflictIdents = [];
          buildResultingPage(cloudElement.content, incomingElement.content, { newChanges, syncMode, syncFold, syncPrivate }, newElement.content, contentConflictIdents, updatedElements);
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
    if (remote.length > 0) {
      if (syncMode === 'autoDelete' && newChanges) { // We are pushing our page and we want to sync deletions
        updatedElements.push(...remote);
      } else if (syncMode === 'autoAdd' && !newChanges) {
        resultPage.push(...remote);
        updatedElements.push(...remote);
      } else {
        for (const cloudElement of remote) {
          if (cloudElement.content == null) {
            conflictIdents.push(cloudElement.ident);
          }
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
