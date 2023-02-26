import dotenv from 'dotenv';
import express from 'express';
import router from './controllers/index.js';
import https from 'https';
import fs from 'fs';
import { initStorage } from './services/storage.service.js';

dotenv.config();
initStorage();

const PORT = process.env.PORT || 5050;
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();

app.use(express.json());
app.use('/api', router);

if (IS_PROD) {
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY),
    cert: fs.readFileSync(process.env.SSL_CERT),
  };

  https.createServer(options, app).listen(PORT, () => {
    console.log(`Server has been started on port ${PORT}...`);
  });
} else {
  app.listen(PORT, () => {
    console.log(`Server has been started on port ${PORT}...`);
  });
}
