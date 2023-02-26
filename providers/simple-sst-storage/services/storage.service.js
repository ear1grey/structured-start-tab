import fs from 'fs';

export const initStorage = () => {
  if (process.env.STORAGE_PATH == null || process.env.STORAGE_PATH === '') {
    throw new Error('Missing storage path');
  }

  fs.mkdirSync(`${process.env.STORAGE_PATH}/pages`, { recursive: true });
  fs.mkdirSync(`${process.env.STORAGE_PATH}/share`, { recursive: true });
};

export const fileExists = (file, ext) => {
  return fs.existsSync(`${process.env.STORAGE_PATH}/${ext}/${file}`);
};

export const getFile = (fileName, ext) => {
  return fs.readFileSync(`${process.env.STORAGE_PATH}/${ext}/${fileName}`, 'utf8');
};

export const pushFile = (fileName, content, ext) => {
  fs.writeFileSync(`${process.env.STORAGE_PATH}/${ext}/${fileName}`, content, 'utf8');
};

export const deleteFile = (fileName, ext) => {
  fs.unlinkSync(`${process.env.STORAGE_PATH}/${ext}/${fileName}`);
};

export const listFiles = (ext) => {
  return fs.readdirSync(`${process.env.STORAGE_PATH}/${ext}`);
};
