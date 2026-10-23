const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n', 'index.ts'), 'utf8');
const languages = ['en', 'cs', 'es', 'de'];

function keysFor(language, nextLanguage) {
  const start = source.indexOf(`  ${language}: {`);
  const end = nextLanguage
    ? source.indexOf(`  ${nextLanguage}: {`, start)
    : source.indexOf('\n};', start);

  assert.notEqual(start, -1, `Missing ${language} locale`);
  assert.notEqual(end, -1, `Could not read ${language} locale`);

  return new Set(
    [...source.slice(start, end).matchAll(/^\s{6}([A-Za-z0-9_]+):/gm)].map(match => match[1]),
  );
}

const localeKeys = Object.fromEntries(
  languages.map((language, index) => [language, keysFor(language, languages[index + 1])]),
);

for (const language of languages.slice(1)) {
  assert.deepEqual(
    [...localeKeys[language]].sort(),
    [...localeKeys.en].sort(),
    `${language} translation keys must match English`,
  );
}

console.log(`PASS ${localeKeys.en.size} translation keys match across ${languages.join(', ')}.`);
