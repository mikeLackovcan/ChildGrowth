const { withAndroidManifest } = require('@expo/config-plugins');

// QR scanning is optional: every family can connect by entering a code.
module.exports = config => withAndroidManifest(config, mod => {
  const manifest = mod.modResults.manifest;
  const features = manifest['uses-feature'] || [];
  for (const name of ['android.hardware.camera', 'android.hardware.camera.autofocus', 'android.hardware.camera.any']) {
    const feature = features.find(item => item.$?.['android:name'] === name);
    if (feature) feature.$['android:required'] = 'false';
    else features.push({ $: { 'android:name': name, 'android:required': 'false' } });
  }
  manifest['uses-feature'] = features;
  return mod;
});
