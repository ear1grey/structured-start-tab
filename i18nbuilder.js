import xlsx from 'node-xlsx';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const workSheetsFromFile = xlsx.parse(`./SST Translations.xlsx`);
const sheet = workSheetsFromFile[0].data;
const yesIndex = new Map();
const dir = './_locales';

for (let i = 0; i < sheet[2].length; i++) {
	const line = sheet[2][i];
	if (line === 'Yes') {
		yesIndex.set(i, sheet[1][i]);
	}
}

sheet.splice(0,4);

for (const locale of yesIndex) {
	const json = {};
	const localeDir = dir + '/' + locale[1];

	for (const line of sheet) {
		if (line[0] === 'Contributor') break;
		json[line[0]] = {
			message: line[locale[0]] 
		};
	}

	if (!existsSync(localeDir)) {
  	mkdirSync(localeDir);
	}

	writeFileSync(localeDir + '/messages.json', JSON.stringify(json, null, 2));
}