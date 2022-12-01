import { readFileSync, writeFileSync } from 'fs';

const manPath = './manifest.json';
const pkgPath = './package.json';

const pkgRaw = readFileSync(pkgPath, 'utf8');
const pkgData = JSON.parse(pkgRaw);

const manRaw = readFileSync(manPath, 'utf8');
const manData = JSON.parse(manRaw);
manData.version = pkgData.version;

pkgData.name = 'structured-start-tab';
pkgData.description = 'Structured Start Tab';

if (pkgData.version.includes('beta')) {
  pkgData.name += '-beta';
  pkgData.description += ' (beta)';
}

writeFileSync(manPath, JSON.stringify(manData, null, 2));
writeFileSync(pkgPath, JSON.stringify(pkgData, null, 2));
