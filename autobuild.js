import { readFileSync, writeFileSync, createReadStream } from 'fs'
import { createInterface } from 'readline'

const fromPath = './src/js/index.ts';
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

const readInterface = createInterface({
  input: createReadStream(fromPath),
  console: false
});

readInterface.on('line', function(line) {
  if (line.includes('const version')) {
    const version = line.split('\'')[1];
    change(version);
  }
});

function change(version) {
  for (const file of toChangePath) {
    const data = JSON.parse(readFileSync(file.path, 'utf8'));
    data['version'] = version;
    writeFileSync(file.path, JSON.stringify(data, null, file.spaces));
  }
}
