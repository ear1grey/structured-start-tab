import { readFileSync, writeFileSync } from 'fs';
import { version } from './src/js/version.js';

const toChangePath = [
  {
    path: './package.json',
    spaces: 2
  },
  {
    path: './package-lock.json',
    spaces: 2
  },
  {
    path: './manifest.json',
    spaces: 4
  }
]

function change(version) {
  for (const file of toChangePath) {
    const data = JSON.parse(readFileSync(file.path, 'utf8'));
    data['version'] = version;
    writeFileSync(file.path, JSON.stringify(data, null, file.spaces));
  }
}

change( version );