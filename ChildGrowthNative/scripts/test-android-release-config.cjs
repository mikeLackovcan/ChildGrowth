const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const {
  OPTIONAL_CAMERA_FEATURES,
  applyOptionalCameraFeatures,
} = require('../plugins/withOptionalCameraFeatures.cjs');

const fixture = {
  manifest: {
    'uses-feature': [
      { $: { 'android:name': 'android.hardware.camera', 'android:required': 'true' } },
      { $: { 'android:name': 'android.hardware.camera.autofocus' } },
      { $: { 'android:name': 'android.hardware.location.gps', 'android:required': 'false' } },
    ],
  },
};

const result = applyOptionalCameraFeatures(fixture);
const features = result.manifest['uses-feature'];

for (const name of OPTIONAL_CAMERA_FEATURES) {
  const matches = features.filter(item => item.$['android:name'] === name);
  assert.equal(matches.length, 1, `${name} should be declared exactly once`);
  assert.equal(matches[0].$['android:required'], 'false', `${name} should be optional`);
}

assert.ok(
  features.some(item => item.$['android:name'] === 'android.hardware.location.gps'),
  'unrelated feature declarations should be preserved',
);

assert.ok(
  appConfig.expo.plugins.includes('./plugins/withOptionalCameraFeatures.cjs'),
  'the optional-camera config plugin must be registered',
);

const buildProperties = appConfig.expo.plugins.find(
  plugin => Array.isArray(plugin) && plugin[0] === 'expo-build-properties',
);
assert.ok(buildProperties, 'expo-build-properties must be configured');
assert.equal(buildProperties[1].android.enableMinifyInReleaseBuilds, true);
assert.equal(buildProperties[1].android.enableShrinkResourcesInReleaseBuilds, true);
assert.ok(packageJson.dependencies['expo-build-properties'], 'expo-build-properties must be installed');

console.log('Android release configuration checks passed.');
