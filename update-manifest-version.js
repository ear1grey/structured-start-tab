import { readFileSync, writeFileSync } from 'fs';

const manPath = './manifest.json';
const pkgPath = './package.json';
const htmlPath = './src/index.html';

// Read and parse files
const pkgRaw = readFileSync(pkgPath, 'utf8');
const pkgData = JSON.parse(pkgRaw);

const manRaw = readFileSync(manPath, 'utf8');
const manData = JSON.parse(manRaw);

const htmlRaw = readFileSync(htmlPath, 'utf8');

// Defaults
pkgData.name = 'structured-start-tab';
pkgData.description = 'Structured Start Tab';
let pageTitle = 'Structured Start Tab';

const [version, type] = pkgData.version.split('-');
manData.version = version;
manData.version_name = version;
manData.name = pkgData.description;

// Add beta definitions
if (type === 'beta') { // beta version should end with -beta
  // package details
  pkgData.name += '-beta';
  pkgData.description += ' (beta)';

  // manifest details
  manData.version_name += '-beta';
  manData.version = `${manData.version}.1`;
  manData.name += manData.name.endsWith(' (Beta)') ? '' : ' (Beta)';

  pageTitle += ' (beta)';
}

// update title in the html
const htmlData = htmlRaw.replace(/<title>.*<\/title>/, `<title>${pageTitle}</title>`);

writeFileSync(manPath, JSON.stringify(manData, null, 2));
writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2));
writeFileSync(htmlPath, htmlData);
