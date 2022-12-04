import functions from 'firebase-functions';
import admin from 'firebase-admin';

admin.initializeApp();

export const getSettings = functions.https.onRequest((req, res) => {
  const id = req.query.id;

  admin.firestore().collection('settings').doc(id).get().then(doc => {
    if (!doc.exists) {
      res.status(404).send('Settings not found');
    } else {
      res.status(200).send(doc.data());
    }
  }).catch(err => {
    res.status(500).send(err);
  });
});

export const saveSettings = functions.https.onRequest((req, res) => {
  const id = req.body.id;
  const settings = req.body.settings;

  admin.firestore().collection('settings').doc(id).get().then(doc => {
    if (!doc.exists) {
      admin.firestore().collection('settings').doc(id).set(settings).then(() => {
        res.send('Settings saved');
      }).catch(err => {
        res.send(err);
      });
    } else {
      admin.firestore().collection('settings').doc(id).update(settings).then(() => {
        res.status(200).send('Settings updated');
      }).catch(err => {
        res.status(500).send(err);
      });
    }
  }).catch(err => {
    res.status(500).send(err);
  });
});
