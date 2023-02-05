import admin from 'firebase-admin';

const getPageByUserId = (id) => {
  return new Promise(resolve =>
    admin.firestore().collection('pages').doc(id).get().then(doc => {
      if (!doc.exists) {
        resolve({
          status: 404,
          content: { error: 'Page not found' },
        });
      } else {
        resolve({
          status: 200,
          content: doc.data(),
        });
      }
    }).catch(error => {
      resolve({
        status: 500,
        content: { error },
      });
    }),
  );
};

const pushPage = (id, content, res) => {
  // v++
  content.version++;

  admin.firestore().collection('pages').doc(id).get().then(doc => {
    if (!doc.exists) {
      admin.firestore().collection('pages').doc(id).set(content).then(() => {
        res.send('pages saved');
      }).catch(error => {
        res.send({ error });
      });
    } else {
      admin.firestore().collection('pages').doc(id).update(content).then(() => {
        res.status(201).send({ version: content.version });
      }).catch(error => {
        res.status(500).send({ error });
      });
    }
  }).catch(error => {
    res.status(500).send({ error });
  });
};

export const getPage = async (req, res) => {
  const id = req.query.id;
  const { status, content } = await getPageByUserId(id);
  res.status(status).send(content);
};

export const savePage = async (req, res) => {
  const id = req.body.id;
  const incomingContent = req.body.content;

  const { status, content } = await getPageByUserId(id);

  if (status === 404) { // if we don't have a page, we create one
    pushPage(id, incomingContent, res);
    return;
  } else if (status !== 200) {
    res.status(status).send(content);
    return;
  }

  pushPage(id, incomingContent, res);
};

export const syncPage = async (req, res) => {
  const id = req.body.id;
  const incomingContent = req.body.content;

  const { status: cloudStatus, content: cloudContent } = await getPageByUserId(id);

  if (cloudStatus === 404) { // if we don't have a page, we create one
    pushPage(id, incomingContent, res);
    return;
  } else if (cloudStatus !== 200) {
    res.status(cloudStatus).send(cloudContent);
    return;
  }

  const newPage = [];
  const conflictIdents = [];
  const updatedElements = [];
  const cloudPage = JSON.parse(cloudContent.page);
  buildResultingPage(cloudPage, JSON.parse(incomingContent.page), incomingContent.options, newPage, conflictIdents, updatedElements);

  if (conflictIdents.length > 0) {
    res.status(409).send({ conflicts: conflictIdents, version: cloudContent.version, cloudPage: cloudContent.page });
  } else if (updatedElements.length > 0) {
    pushPage(id, { version: incomingContent.version, page: JSON.stringify(newPage) }, res);
  } else {
    res.status(200).send(cloudContent);
  }
};

const elementBasePropertiesEqual = (incomingElement, cloudElement, { syncFold, syncPrivate }) => {
  return incomingElement.backgroundColour === cloudElement.backgroundColour &&
    incomingElement.textColour === cloudElement.textColour &&
    incomingElement.type === cloudElement.type &&

    // panel only properties
    incomingElement.direction === cloudElement.direction &&
    incomingElement.header === cloudElement.header &&
    incomingElement.id === cloudElement.id &&
    incomingElement.singleLineDisplay === cloudElement.singleLineDisplay &&
    incomingElement.textColour === cloudElement.textColour &&
    incomingElement.type === cloudElement.type &&
    // optional panel properties
    (syncFold ? incomingElement.folded === cloudElement.folded : true) &&
    (syncPrivate ? incomingElement.private === cloudElement.private : true) &&
    // link only properties
    incomingElement.name === cloudElement.name &&
    incomingElement.url === cloudElement.url;
};

const buildResultingPage = (
  cloudObject, incomingObject, { autoAdd = false, autoDelete = false, syncFold = true, syncPrivate = true } = {}, resultPage, conflictIdents, updatedElements) => {
  // clean-up content!!
  if (Array.isArray(incomingObject)) incomingObject = incomingObject.filter(elem => elem.id !== 'trash');
  if (Array.isArray(cloudObject)) cloudObject = cloudObject.filter(elem => elem.id !== 'trash');

  // If they are both arrays, check all the elements
  if (Array.isArray(incomingObject) && Array.isArray(cloudObject)) {
    // Go through all the elements of the incoming page
    for (const incomingElement of incomingObject) {
      const cloudElementIndex = cloudObject.findIndex(elem => elem.ident === incomingElement.ident);
      const cloudElement = cloudElementIndex !== -1 ? cloudObject[cloudElementIndex] : null;

      if (!cloudElement) { // Cloud element not found
        if (!autoAdd) {
          conflictIdents.push(incomingElement.ident);
          continue;
        }

        resultPage.push(incomingElement);
        updatedElements.push(incomingElement);
      } else { // Cloud element found
        cloudObject.splice(cloudElementIndex, 1);

        // Check if the panel properties are different
        if (!elementBasePropertiesEqual(incomingElement, cloudElement, { syncFold, syncPrivate })) {
          conflictIdents.push(incomingElement.ident);
        }

        const newElement = { ...cloudElement };
        if (newElement.content) newElement.content = []; // Don't automatically add the content already present
        if (incomingElement.content) {
          const contentConflictIdents = [];
          buildResultingPage(cloudElement.content, incomingElement.content, { autoAdd, autoDelete, syncFold, syncPrivate }, newElement.content, contentConflictIdents, updatedElements);
          if (contentConflictIdents.length > 0) {
            for (const contentConflictIdent of contentConflictIdents) {
              conflictIdents.push(contentConflictIdent);
            }
          }
        }
        resultPage.push(newElement);
      }
    }

    // Elements that are left in the cloudObject but are not present in the incomingObject
    if (cloudObject.length > 0) {
      if (autoDelete) {
        updatedElements.push(...cloudObject);
      } else {
        for (const cloudElement of cloudObject) {
          if (cloudElement.content == null) {
            conflictIdents.push(cloudElement.ident);
          }
        }
      }
    }
  } else { // If they are not both arrays, check the base properties
    if (!elementBasePropertiesEqual(incomingObject, cloudObject, { syncFold, syncPrivate })) {
      conflictIdents.push(incomingObject.ident);
    }
    if (incomingObject.content) {
      const contentConflictIdents = [];
      buildResultingPage(cloudObject.content, incomingObject.content, { autoAdd, autoDelete, syncFold, syncPrivate }, resultPage);
      if (contentConflictIdents.length > 0) {
        for (const contentConflictIdent of contentConflictIdents) {
          conflictIdents.push(contentConflictIdent);
        }
      }
    }
    resultPage.push(cloudObject);
  }
};
