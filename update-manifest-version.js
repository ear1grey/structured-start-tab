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
manData.version = pkgData.version;
pkgData.name = 'structured-start-tab';
pkgData.description = 'Structured Start Tab';
let pageTitle = 'Structured Start Tab';

// Add beta definitions
if (pkgData.version.split('.').length > 3) { // beta version should be structured as X.Y.Z.B whilst release version is X.Y.Z
  pkgData.name += '-beta';
  manData.name += manData.name.endsWith(' (Beta)') ? '' : ' (Beta)';
  pkgData.description += ' (beta)';
  manData.description += manData.description.endsWith(' (beta)') ? '' : ' (beta)';

  pageTitle += ' (beta)';
}

// update title in the html
const htmlData = htmlRaw.replace(/<title>.*<\/title>/, `<title>${pageTitle}</title>`);

writeFileSync(manPath, JSON.stringify(manData, null, 2));
writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2));
writeFileSync(htmlPath, htmlData);
