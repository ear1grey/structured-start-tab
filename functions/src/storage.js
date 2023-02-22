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
