const fs = require('node:fs/promises');
const path = require('node:path');
const { withAndroidManifest, withDangerousMod, AndroidConfig } = require('expo/config-plugins');
const metadataKey = 'expo.modules.notifications.large_notification_icon';
function applyHeroMetadata(manifest) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(manifest);
  application['meta-data'] = (application['meta-data'] || []).filter(item => item.$['android:name'] !== metadataKey);
  application['meta-data'].push({ $: {
    'android:name': metadataKey, 'android:resource': '@drawable/quest_champ_notification',
  } });
  return manifest;
}
/** SDK 57 reads this metadata for local Android notification portraits. */
module.exports = function withHeroNotification(config) {
  config = withAndroidManifest(config, config => {
    config.modResults = applyHeroMetadata(config.modResults);
    return config;
  });
  return withDangerousMod(config, ['android', async config => {
    const resources = path.join(config.modRequest.platformProjectRoot, 'app/src/main/res/drawable');
    await fs.mkdir(resources, { recursive: true });
    await fs.copyFile(path.join(config.modRequest.projectRoot, 'assets/branding/quest-hero-play-512.png'), path.join(resources, 'quest_champ_notification.png'));
    return config;
  }]);
};
module.exports.applyHeroMetadata = applyHeroMetadata;
