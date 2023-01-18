import functions from 'firebase-functions';
import admin from 'firebase-admin';

admin.initializeApp();

const getSettingsById = (id) => {
  return new Promise(resolve =>
    admin.firestore().collection('settings').doc(id).get().then(doc => {
      if (!doc.exists) {
        resolve({
          status: 404,
          content: { error: 'Settings not found' },
        });
      } else {
        const data = doc.data();
        resolve({
          status: 200,
          content: {
            settings: data.settings,
            version: data.version,
          },
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

const pushSettings = (id, content, res) => {
  admin.firestore().collection('settings').doc(id).get().then(doc => {
    if (!doc.exists) {
      admin.firestore().collection('settings').doc(id).set(content).then(() => {
        res.send('Settings saved');
      }).catch(error => {
        res.send({ error });
      });
    } else {
      admin.firestore().collection('settings').doc(id).update(content).then(() => {
        res.status(200).send({ version: content.version });
      }).catch(error => {
        res.status(500).send({ error });
      });
    }
  }).catch(error => {
    res.status(500).send({ error });
  });
};

export const getSettings = functions.https.onRequest(async (req, res) => {
  const id = req.query.id;
  const { status, content } = await getSettingsById(id);
  console.log();
  res.status(status).send(content);
});

export const syncSettings = functions.https.onRequest(async (req, res) => {
  const id = req.body.id;
  const incomingContent = req.body.content;

  const { status, content } = await getSettingsById(id);

  if (status === 200) {
    // if the version that we have is greater than the incoming version, we may have a merge conflict
    if (content.version >= incomingContent.version) {
      res.status(409).send(content); // return the current saved content to be dealt with on the client side
      return;
    }
  } else if (status >= 400 && status !== 404) { // 404 means that there's no config for the user - we want to create a new config
    res.status(status).send(content);
    return;
  }
  // if all is OK, we save the content
  pushSettings(id, incomingContent, res);
});
