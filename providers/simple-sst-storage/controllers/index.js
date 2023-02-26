import { Router } from 'express';
import storageController from './storage.controller.js';

const router = new Router();
router.use('/storage', storageController);

export default router;
