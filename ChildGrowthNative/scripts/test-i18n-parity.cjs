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

// Supplemental UI dictionaries are consumed by the central i18n configuration.
// Check values and interpolation parameters, not just whether keys exist.
const dictionaries = Object.fromEntries(languages.map(language => [
  language, JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'src', 'i18n', `ui.${language}.json`), 'utf8')),
]));
const parameters = text => [...text.matchAll(/{{\s*([^}]+?)\s*}}/g)].map(match => match[1]).sort();
for (const language of languages) {
  assert.deepEqual(Object.keys(dictionaries[language]).sort(), Object.keys(dictionaries.en).sort());
  for (const [key, value] of Object.entries(dictionaries[language])) {
    assert.equal(typeof value, 'string', `${language}.${key} must be text`);
    assert.ok(value.trim(), `${language}.${key} cannot be empty`);
    assert.deepEqual(parameters(value), parameters(dictionaries.en[key]), `${language}.${key} interpolation mismatch`);
  }
}
console.log(`PASS ${Object.keys(dictionaries.en).length} additional UI keys and interpolation parameters across all locales.`);

// These migrated surfaces must not regress to hard-coded visible text.
// This is deliberately scoped, not a claim that all app screens are localized.
const ts = require('typescript');
for (const relative of ['src/app/(tabs)/milestones.tsx', 'src/components/RewardGoalCard.tsx', 'src/app/(tabs)/shop.tsx',
  'src/app/link-account.tsx', 'src/components/ParentPairingSetup.tsx',
  'src/components/PrizeWheelModal.tsx', 'src/components/HeroCelebrationModal.tsx', 'src/app/quest-map.tsx',
  'src/app/role-select.tsx', 'src/components/ParentPrizeEditor.tsx', 'src/app/parent-dashboard.tsx',
  'src/app/(tabs)/tips.tsx', 'src/app/support.tsx', 'src/app/privacy.tsx',
  'src/components/SettingsModal.tsx', 'src/components/WeeklyProgress.tsx',
  'src/app/welcome.tsx', 'src/app/manage-tasks.tsx', 'src/app/focus-session.tsx',
  'src/app/(tabs)/index.tsx', 'src/app/(tabs)/world.tsx', 'src/lib/notifications.ts']) {
  const file = ts.createSourceFile(relative, fs.readFileSync(path.join(__dirname, '..', relative), 'utf8'),
    ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  function visit(node) {
    if (relative === 'src/app/focus-session.tsx' && (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node))
      && node.tagName.getText(file) === 'TouchableOpacity') {
      assert.ok(node.attributes.properties.some(attribute => ts.isJsxAttribute(attribute)
        && attribute.name.getText(file) === 'accessibilityRole' && attribute.initializer
        && ts.isStringLiteral(attribute.initializer) && attribute.initializer.text === 'button'),
      'Focus controls must expose button semantics');
    }
    if (ts.isJsxText(node)) {
      const isBrand = node.text.trim() === 'Quest Champ';
      assert.ok(isBrand || !/[A-Za-z]/.test(node.text), `${relative}: untranslated visible text: ${node.text.trim()}`);
    }
    if (ts.isJsxAttribute(node) && ['title', 'placeholder', 'accessibilityLabel', 'accessibilityHint'].includes(node.name.getText(file))
      && node.initializer && ts.isStringLiteral(node.initializer)) {
      assert.fail(`${relative}: untranslated ${node.name.getText(file)}`);
    }
    if (ts.isCallExpression(node) && ((ts.isIdentifier(node.expression) && node.expression.text === 't')
      || (ts.isPropertyAccessExpression(node.expression) && node.expression.getText(file) === 'i18n.t'))
      && node.arguments[0] && ts.isStringLiteral(node.arguments[0])) {
      const key = node.arguments[0].text;
      assert.ok(key in dictionaries.en || localeKeys.en.has(key), `${relative}: missing translation ${key}`);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
}
// Shop item keys are assembled from durable catalog IDs at runtime.
const tipsSource = fs.readFileSync(path.join(__dirname, '..', 'src/app/(tabs)/tips.tsx'), 'utf8');
for (const match of tipsSource.matchAll(/'(tips_[a-z_]+)'/g)) {
  for (const language of languages) assert.ok(dictionaries[language][match[1]], `Missing ${language}.${match[1]}`);
}
const authMessages = fs.readFileSync(path.join(__dirname, '..', 'src/lib/authMessages.ts'), 'utf8');
for (const match of authMessages.matchAll(/'(auth_[a-z_]+)'/g)) {
  for (const language of languages) assert.ok(dictionaries[language][match[1]], `Missing ${language}.${match[1]}`);
}
const catalog = fs.readFileSync(path.join(__dirname, '..', 'src/lib/heroCatalog.ts'), 'utf8');
const themeSource = fs.readFileSync(path.join(__dirname, '..', 'src/constants/theme.ts'), 'utf8');
const shopKeys = [
  ...[...catalog.matchAll(/id: '(quest_[a-z]+)'/g)].map(match => 'shop_personality_' + match[1]),
  ...['Heroes', 'Backgrounds', 'Colors'].map(section => 'shop_' + section),
];
for (const [type, prefix] of [['BackgroundKey', 'shop_bg_'], ['ThemeKey', 'shop_theme_']]) {
  const declaration = themeSource.match(new RegExp('export type ' + type + ' = ([^;]+);'));
  assert.ok(declaration, `Missing ${type} declaration`);
  shopKeys.push(...[...declaration[1].matchAll(/'([^']+)'/g)].map(match => prefix + match[1]));
}
assert.ok(shopKeys.length >= 31, 'Shop catalog coverage must include every hero, background, theme and section');
for (const key of shopKeys) {
  for (const language of languages) assert.ok(dictionaries[language][key], `Missing ${language}.${key}`);
}
const pairingScreen = fs.readFileSync(path.join(__dirname, '..', 'src/app/link-account.tsx'), 'utf8');
for (const match of pairingScreen.matchAll(/'(pair_[a-z_]+)'/g)) {
  for (const language of languages) assert.ok(dictionaries[language][match[1]], `Missing ${language}.${match[1]}`);
}
for (const key of ['map_daily', 'map_weekdays', 'map_weekends', 'map_first', 'map_another']) {
  for (const language of languages) assert.ok(dictionaries[language][key], `Missing ${language}.${key}`);
}
console.log('PASS localization guards for core child screens, family screens, settings, rewards and notification keys.');
