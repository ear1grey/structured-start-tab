import admin from 'firebase-admin';

export const getFullContent = (req, res) => {
  const { owner } = req.query;

  admin.firestore().collection('content').doc(owner).get().then(doc => {
    if (!doc.exists) {
      res.status(404).send({ error: 'Content not found' });
    } else {
      res.status(200).send(doc.data());
    }
  }).catch(error => {
    res.status(500).send({ error });
  });
};

export const setFullContent = (req, res) => {
  const { owner } = req.query;
  const { content } = req.body;

  admin.firestore().collection('content').doc(owner).set(content).then(() => {
    res.status(200).send({ success: true });
  }).catch(error => {
    res.status(500).send({ error });
  });
};
