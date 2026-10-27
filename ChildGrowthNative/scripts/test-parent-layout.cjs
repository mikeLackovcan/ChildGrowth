const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

test('readable inputs grow for content without forcing cursor selection', () => {
  let height = 56;
  const filename = path.join(root, 'src/components/ReadableTextInput.tsx');
  const mod = new Module(filename, module);
  mod.require = name => {
    if (name === 'react') return { useState: () => [height, update => { height = update(height); }] };
    if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }) };
    if (name === 'react-native') return { TextInput: 'TextInput' };
    throw new Error(`Unexpected dependency: ${name}`);
  };
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, filename);
  const input = mod.exports.default({ value: 'A long family-authored challenge' });
  assert.equal(input.props.multiline, true);
  assert.equal(input.props.scrollEnabled, false);
  assert.equal(input.props.selection, undefined);
  input.props.onContentSizeChange({ nativeEvent: { contentSize: { height: 144.2 } } });
  assert.equal(height, 145);
  input.props.onContentSizeChange({ nativeEvent: { contentSize: { height: 144.2 } } });
  assert.equal(height, 145, 'repeated layout events must not accumulate padding');
  input.props.onContentSizeChange({ nativeEvent: { contentSize: { height: 24 } } });
  assert.equal(height, 56);
});

test('parent fields stay full width and use the shared readable input', () => {
  const screen = fs.readFileSync(path.join(root, 'src/app/parent-dashboard.tsx'), 'utf8');
  assert.doesNotMatch(screen, /width: '48%'/);
  assert.equal((screen.match(/<ReadableTextInput/g) || []).length, 1);
  assert.match(screen, /react-native-safe-area-context/);
  for (const component of ['ParentPrizeEditor', 'ParentPairingSetup', 'RewardGoalCard']) {
    assert.match(fs.readFileSync(path.join(root, `src/components/${component}.tsx`), 'utf8'), /<ReadableTextInput/);
  }
});

test('parent dashboard signs out deterministically and does not poll stale account state', () => {
  const screen = fs.readFileSync(path.join(root, 'src/app/parent-dashboard.tsx'), 'utf8');
  assert.match(screen, /await logout\(\);\s*router\.replace\('\/'\)/);
  assert.doesNotMatch(screen, /setInterval/);
  assert.doesNotMatch(screen, /addChildByNickname/);
  assert.doesNotMatch(screen, /childNicknameInput|childNameInput/);
});

test('family connection supports multiple children and lost-phone recovery without child email', () => {
  const screen = fs.readFileSync(path.join(root, 'src/app/parent-dashboard.tsx'), 'utf8');
  const setup = fs.readFileSync(path.join(root, 'src/components/ParentPairingSetup.tsx'), 'utf8');
  assert.match(screen, /connectedChildren\.map/);
  assert.match(screen, /selectChild\(child\.id\)/);
  assert.match(setup, /replaceChildDevice/);
  assert.match(setup, /pair_replace_device/);
  assert.doesNotMatch(setup, /email/i);
});

test('parent and auth forms opt into safe areas and keyboard-aware scrolling', () => {
  const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
  assert.equal(appConfig.expo.android.softwareKeyboardLayoutMode, 'resize');
  assert.equal(appConfig.expo.androidStatusBar.translucent, false);
  for (const file of ['src/app/parent-dashboard.tsx', 'src/app/index.tsx', 'src/app/link-account.tsx', 'src/app/welcome.tsx']) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.match(source, /KeyboardAvoidingView/, file);
    assert.match(source, /keyboardDismissMode="on-drag"/, file);
  }
});
