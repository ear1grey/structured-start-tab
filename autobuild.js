const fs = require('fs');
const readline = require('readline');

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

const readInterface = readline.createInterface({
  input: fs.createReadStream(fromPath),
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
    let data = JSON.parse(fs.readFileSync(file.path, "utf8"));
    data['version'] = version;
    fs.writeFileSync(file.path, JSON.stringify(data, null, file.spaces));
  }
}