const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const javaHome = 'C:\\Users\\mikef\\.jdks\\jdk-17.0.20.1+1';
const androidHome = 'C:\\Users\\mikef\\AppData\\Local\\Android\\Sdk';

const env = {
  ...process.env,
  JAVA_HOME: javaHome,
  ANDROID_HOME: androidHome,
  ANDROID_SDK_ROOT: androidHome,
  PATH: path.join(javaHome, 'bin') + ';' +
        path.join(androidHome, 'platform-tools') + ';' +
        path.join(androidHome, 'build-tools', '35.0.0') + ';' +
        process.env.PATH
};

console.log('🚀 Starting Gradle assembleRelease with JDK 17 (Temurin)...');
console.log('   JAVA_HOME:', javaHome);
console.log('   ANDROID_HOME:', androidHome);

const proc = spawn('cmd.exe', ['/c', 'gradlew.bat', 'assembleRelease', '--no-daemon', '--stacktrace'], {
  cwd: path.join(__dirname, '..', 'android'),
  env,
  stdio: 'inherit'
});

proc.on('close', (code) => {
  if (code === 0) {
    console.log('\n🎉 BUILD SUCCESSFUL! Packaging APK...');
    const src = path.join(__dirname, '..', 'android', 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
    const destDist = path.join(__dirname, '..', 'dist', 'QuestBlox.apk');
    const destArtifact = 'C:\\Users\\mikef\\.gemini\\antigravity-ide\\brain\\de1629bb-8064-4edd-8e35-d8b6da8963d9\\QuestBlox.apk';

    if (fs.existsSync(src)) {
      fs.copyFileSync(src, destDist);
      console.log('✅ Copied to:', destDist);
      try {
        fs.copyFileSync(src, destArtifact);
        console.log('✅ Copied to artifact:', destArtifact);
      } catch (e) {
        console.warn('Could not copy to artifact path:', e.message);
      }
      const stat = fs.statSync(destDist);
      console.log(`📦 Final QuestBlox APK size: ${(stat.size / (1024 * 1024)).toFixed(2)} MB`);
    } else {
      console.error('❌ Generated APK not found at expected path:', src);
    }
  } else {
    console.error(`\n❌ BUILD FAILED with exit code ${code}`);
    process.exit(code);
  }
});
