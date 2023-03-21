import { Router } from 'express';
import { validateRequest } from '../services/auth.service.js';
import * as storageService from '../services/storage.service.js';

const router = new Router();

const getContentByUser = (req, res) => {
  const validationResult = validateRequest(req);
  if (!validationResult.valid) {
    res.status(validationResult.status).send(validationResult.message);
    return;
  }

  // Get the user id from the request
  const userId = req.query.userId;
  if (!userId) {
    res.status(400).send('Missing user id');
    return;
  }

  const fileName = `${userId}.json`;
  if (!storageService.fileExists(fileName, 'pages')) {
    res.status(404).send('Not Found');
    return;
  }

  const fileContent = storageService.getFile(fileName, 'pages');
  res.send(JSON.parse(fileContent));
};

const pushContent = (req, res) => {
  const validationResult = validateRequest(req);
  if (!validationResult.valid) {
    res.status(validationResult.status).send(validationResult.message);
    return;
  }

  const { userId, content } = req.body;

  if (!userId) {
    res.status(400).send('Missing user id');
    return;
  }

  if (!content) {
    res.status(400).send('Missing content');
    return;
  }

  const fileName = `${userId}.json`;
  storageService.pushFile(fileName, JSON.stringify(content, null, 2), 'pages');
  res.send('OK');
};

const getPanel = (req, res) => {
  const validationResult = validateRequest(req);
  if (!validationResult.valid) {
    res.status(validationResult.status).send(validationResult.message);
    return;
  }

  // Get the user id from the request
  const panelId = req.query.panelId;
  if (!panelId) {
    res.status(400).send('Missing panel id');
    return;
  }

  const fileName = `${panelId}.json`;
  if (!storageService.fileExists(fileName, 'share')) {
    res.status(404).send('Not Found');
    return;
  }

  const fileContent = storageService.getFile(fileName, 'share');
  res.send(JSON.parse(fileContent));
};

const pushPanel = (req, res) => {
  const validationResult = validateRequest(req);
  if (!validationResult.valid) {
    res.status(validationResult.status).send(validationResult.message);
    return;
  }

  const { panelId, content } = req.body;

  if (!panelId) {
    res.status(400).send('Missing panel id');
    return;
  }

  if (!content) {
    res.status(400).send('Missing content');
    return;
  }

  const fileName = `${panelId}.json`;
  storageService.pushFile(fileName, JSON.stringify(content, null, 2), 'share');
  res.send('OK');
};

const deleteAllPanels = (req, res) => {
  const validationResult = validateRequest(req);
  if (!validationResult.valid) {
    res.status(validationResult.status).send(validationResult.message);
    return;
  }

  const { owner } = req.query;
  for (const file of storageService.listFiles('share')) {
    const fileContent = storageService.getFile(file, 'share');
    const content = JSON.parse(fileContent);
    if (content.owner === owner) {
      storageService.deleteFile(file, 'share');
    }
  }

  res.send('OK');
};

router.get('/', getContentByUser);
router.post('/', pushContent);
router.get('/panel', getPanel);
router.post('/panel', pushPanel);
router.delete('/panels', deleteAllPanels);

export default router;
