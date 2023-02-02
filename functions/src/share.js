import admin from 'firebase-admin';

export const getAllPanels = (req, res) => {
  const { owner } = req.query;
  admin.firestore().collection('shared').where('owner', '==', owner).get().then(snapshot => {
    const panels = [];
    snapshot.forEach(doc => {
      panels.push({
        id: doc.id,
        ...doc.data(),
      });
    });
    res.send(panels);
  }).catch(error => {
    res.send({ error });
  });
};

export const getPanel = (req, res) => {
  const { id } = req.query;
  admin.firestore().collection('shared').doc(id).get().then(doc => {
    if (!doc.exists) {
      res.status(404).send({ error: 'Panel not found' });
    } else {
      res.send(doc.data());
    }
  }).catch(error => {
    res.send({ error });
  });
};

export const sharePanel = (req, res) => {
  console.log('start');
  const { id, content } = req.body;

  admin.firestore().collection('shared').doc(id).get().then(doc => {
    if (!doc.exists) {
      admin.firestore().collection('shared').doc(id).set(content).then(() => {
        res.status(201).send('Panel shared');
      }).catch(error => {
        console.log('errorA', error);
        res.send({ error });
      });
    } else {
      admin.firestore().collection('shared').doc(id).update(content).then(() => {
        res.status(200).send('Panel updated');
      }).catch(error => {
        res.status(500).send({ error });
      });
    }
  }).catch(error => {
    console.log('errorB', error);
    res.status(500).send({ error });
  });
};
