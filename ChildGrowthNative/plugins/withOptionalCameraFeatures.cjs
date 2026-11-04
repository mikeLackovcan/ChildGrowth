const { withAndroidManifest } = require('expo/config-plugins');

const OPTIONAL_CAMERA_FEATURES = [
  'android.hardware.camera.any',
  'android.hardware.camera',
  'android.hardware.camera.autofocus',
  'android.hardware.camera.flash',
];

function applyOptionalCameraFeatures(manifest) {
  const current = manifest.manifest['uses-feature'] || [];
  const optionalNames = new Set(OPTIONAL_CAMERA_FEATURES);

  manifest.manifest['uses-feature'] = current
    .filter(item => !optionalNames.has(item?.$?.['android:name']))
    .concat(OPTIONAL_CAMERA_FEATURES.map(name => ({
      $: {
        'android:name': name,
        'android:required': 'false',
      },
    })));

  return manifest;
}

/** QR scanning is optional because both family-linking flows retain manual codes. */
module.exports = function withOptionalCameraFeatures(config) {
  return withAndroidManifest(config, config => {
    config.modResults = applyOptionalCameraFeatures(config.modResults);
    return config;
  });
};

module.exports.OPTIONAL_CAMERA_FEATURES = OPTIONAL_CAMERA_FEATURES;
module.exports.applyOptionalCameraFeatures = applyOptionalCameraFeatures;
