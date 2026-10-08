const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
const destDist = path.join(__dirname, '..', 'dist', 'QuestBlox.apk');
const destArtifact = 'C:\\Users\\mikef\\.gemini\\antigravity-ide\\brain\\de1629bb-8064-4edd-8e35-d8b6da8963d9\\QuestBlox.apk';

function copyIfReady() {
  if (fs.existsSync(src)) {
    try {
      const stats = fs.statSync(src);
      if (stats.size > 1000000) { // at least 1MB
        // ensure write is complete
        fs.copyFileSync(src, destDist);
        console.log('Copied to ' + destDist + ' (' + (stats.size / 1024 / 1024).toFixed(2) + ' MB)');
        fs.copyFileSync(src, destArtifact);
        console.log('Copied to artifact: ' + destArtifact);
        return true;
      }
    } catch (e) {
      // file might be locked while writing
    }
  }
  return false;
}

if (!copyIfReady()) {
  console.log('Waiting for APK generation to complete...');
  const interval = setInterval(() => {
    if (copyIfReady()) {
      clearInterval(interval);
      process.exit(0);
    }
  }, 3000);
}
