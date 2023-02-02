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

/**
 * @param {*} incoming - the incoming page to save
 * @param {*} cloud - the page currently saved in the cloud
 * @param {*} options - options for the sync
 */
const getSyncAction = (incoming, cloud, { autoAdd = false, syncFold = true, syncPrivate = true } = {}) => {
  if ((incoming == null && cloud == null) || !Array.isArray(incoming)) return 'none';

  // clean-up content
  incoming = incoming.filter(elem => elem.id !== 'trash');
  cloud = cloud.filter(elem => elem.id !== 'trash');

  // if the lengths are different and we can't auto add, we have a conflict
  if (incoming.length < cloud.length || (incoming.length > cloud.length && !autoAdd)) return 'conflict';

  // TODO: push only new elements and not the whole page

  for (const incomingElement of incoming.filter(elem => elem.id !== 'trash')) {
    const cloudElement = cloud.find(elem => elem.ident === incomingElement.ident);
    if (!cloudElement) {
      if (autoAdd) return 'push';
      return 'conflict';
    }

    const contentAction = getSyncAction(incomingElement.content, cloudElement.content, { autoAdd, syncFold, syncPrivate });
    if (contentAction !== 'none') return contentAction;

    if (incomingElement.backgroundColour !== cloudElement.backgroundColour ||
      incomingElement.textColour !== cloudElement.textColour ||
      incomingElement.type !== cloudElement.type ||

      // panel only properties
      incomingElement.direction !== cloudElement.direction ||
      incomingElement.grow !== cloudElement.grow ||
      incomingElement.header !== cloudElement.header ||
      incomingElement.id !== cloudElement.id ||
      incomingElement.singleLineDisplay !== cloudElement.singleLineDisplay ||
      incomingElement.textColour !== cloudElement.textColour ||
      incomingElement.type !== cloudElement.type ||
      // optional panel properties
      (syncFold ? incomingElement.folded !== cloudElement.folded : false) ||
      (syncPrivate ? incomingElement.private !== cloudElement.private : false) ||

      // link only properties
      incomingElement.name !== cloudElement.name ||
      incomingElement.url !== cloudElement.url) {
      return 'push';
    }
  }

  return 'none';
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

  const { status, content } = await getPageByUserId(id);

  if (status === 404) { // if we don't have a page, we create one
    pushPage(id, incomingContent, res);
    return;
  } else if (status !== 200) {
    res.status(status).send(content);
    return;
  }

  const syncAction = getSyncAction(JSON.parse(incomingContent.page), JSON.parse(content.page), incomingContent.options);
  switch (syncAction) {
    case 'push':
      pushPage(id, incomingContent, res);
      return;
    case 'conflict':
      res.status(409).send(content); // return the current saved content to be dealt with on the client side
      return;
    default:
      res.status(200).send(content);
  }
};
