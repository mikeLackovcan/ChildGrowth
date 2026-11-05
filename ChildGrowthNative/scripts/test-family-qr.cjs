const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/familyQr.ts'), 'utf8')
  .replace(/export function /g, 'function ')
  .replace(/: string/g, '');
const api = new Function(`${source}; return { normalizeFamilyCode, formatFamilyCode, childQrValue, childCodeFromQr };`)();

const checks = [];
const check = (name, condition) => {
  if (!condition) throw new Error(name);
  checks.push(name);
};

check('normalizes a typed child code', api.normalizeFamilyCode('abcd-efgh') === 'ABCDEFGH');
check('formats a child code for reading', api.formatFamilyCode('ABCDEFGH') === 'ABCD-EFGH');
check('builds a child QR link', api.childQrValue('ABCD-EFGH') === 'questblox://link-account?code=ABCDEFGH');
check('reads a valid Questblox child QR', api.childCodeFromQr('questblox://link-account?code=ABCDEFGH') === 'ABCDEFGH');
check('rejects a nickname QR from the old matching flow', api.childCodeFromQr('questblox://link-account?tag=pixel_panda') === null);
check('rejects a different app link', api.childCodeFromQr('https://example.com/?code=ABCDEFGH') === null);
check('rejects ambiguous characters', api.childCodeFromQr('questblox://link-account?code=ABCD0FGH') === null);
check('rejects malformed encoding', api.childCodeFromQr('questblox://link-account?code=%E0%A4%A') === null);

console.log(`Family QR checks passed (${checks.length} checks).`);
