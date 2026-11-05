const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../src/utils/familyQr.ts'), 'utf8')
  .replace(/export function /g, 'function ')
  .replace(/: string/g, '');
const api = new Function(`${source}; return { childQrValue, childTagFromQr };`)();

const checks = [];
const check = (name, condition) => {
  if (!condition) throw new Error(name);
  checks.push(name);
};

check('builds a child QR link', api.childQrValue(' Pixel_Panda ') === 'questblox://link-account?tag=pixel_panda');
check('reads a valid Questblox child QR', api.childTagFromQr('questblox://link-account?tag=pixel_panda') === 'pixel_panda');
check('reads an encoded nickname', api.childTagFromQr('questblox://link-account?tag=pixel%2Dpanda') === 'pixel-panda');
check('rejects a different app link', api.childTagFromQr('https://example.com/?tag=pixel_panda') === null);
check('rejects a malformed nickname', api.childTagFromQr('questblox://link-account?tag=xy') === null);
check('rejects malformed encoding', api.childTagFromQr('questblox://link-account?tag=%E0%A4%A') === null);

console.log(`Family QR checks passed (${checks.length} checks).`);
