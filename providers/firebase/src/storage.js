import admin from 'firebase-admin';

export const getContentByUser = async (req, res) => {
  const id = req.query.userId;
  const doc = await admin.firestore().collection('pages_v2').doc(id).get();
  if (!doc.exists) {
    res.status(404).send({ error: 'Page not found' });
  } else {
    res.status(200).send(doc.data());
  }
};

export const pushContent = async (req, res) => {
  const id = req.body.userId;
  const incomingContent = req.body.content;

  const doc = await admin.firestore().collection('pages_v2').doc(id).get();
  if (!doc.exists) {
    await admin.firestore().collection('pages_v2').doc(id).set(incomingContent);
    res.send('pages saved');
  } else {
    await admin.firestore().collection('pages_v2').doc(id).update(incomingContent);
    res.status(201).send({ cloudPage: incomingContent.page, cloudVersion: incomingContent.version });
  }
};

export const getPanel = async (req, res) => {
  const { id } = req.query;
  const doc = await admin.firestore().collection('share_v2').doc(id).get();
  if (!doc.exists) {
    res.status(404).send({ error: 'Panel not found' });
  } else {
    res.status(200).send(doc.data());
  }
};

export const pushPanel = (req, res) => {
  const { id, content } = req.body;

  admin.firestore().collection('share_v2').doc(id).get().then(doc => {
    if (!doc.exists) {
      admin.firestore().collection('share_v2').doc(id).set(content).then(() => {
        res.status(201).send('Panel shared');
      }).catch(error => {
        res.send({ error });
      });
    } else {
      admin.firestore().collection('share_v2').doc(id).update(content).then(() => {
        res.status(200).send('Panel updated');
      }).catch(error => {
        res.status(500).send({ error });
      });
    }
  }).catch(error => {
    res.status(500).send({ error });
  });
};

export const deleteAllPanels = (req, res) => {
  const { owner } = req.query;

  admin.firestore().collection('share_v2').where('owner', '==', owner).get().then(snapshot => {
    snapshot.forEach(doc => {
      admin.firestore().collection('share_v2').doc(doc.id).delete();
    });
    res.status(200).send('Panels deleted');
  }).catch(error => {
    res.status(500).send({ error });
  });
};
