// app.plugin.js
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

function patchBuildGradle(content) {
  let updated = content;

  // 1) Remove any buildToolsVersion lines (prevents 29.0.2 warnings)
  updated = updated.replace(/^\s*buildToolsVersion\s+.*\n/gm, '');

  // 2) Force compileSdkVersion 35 (replace compileSdk or compileSdkVersion forms)
  updated = updated.replace(
    /^\s*compileSdk(?:Version)?\s+.*$/m,
    '    compileSdkVersion 35'
  );

  // 3) Ensure defaultConfig contains targetSdkVersion/minSdkVersion
  updated = updated.replace(
    /defaultConfig\s*\{([\s\S]*?)\}/m,
    (match, inner) => {
      // Replace target/min if present; otherwise inject them.
      let block = inner;

      if (/minSdkVersion\s+\d+/.test(block)) {
        block = block.replace(/minSdkVersion\s+\d+/, 'minSdkVersion 24');
      } else {
        block = `\n        minSdkVersion 24\n` + block;
      }

      if (/targetSdkVersion\s+\d+/.test(block)) {
        block = block.replace(/targetSdkVersion\s+\d+/, 'targetSdkVersion 35');
      } else {
        block = `\n        targetSdkVersion 35\n` + block;
      }

      return `defaultConfig {${block}}`;
    }
  );

  return updated;
}

function patchRootBuildGradle(content) {
  let updated = content;

  // Remove explicit buildTools in root if present (rare, but safe)
  updated = updated.replace(/^\s*buildToolsVersion\s+.*\n/gm, '');

  return updated;
}

module.exports = function withAndroidGradleFix(config) {
  // Patch android/app/build.gradle
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const appGradlePath = path.join(cfg.modRequest.projectRoot, 'android', 'app', 'build.gradle');
      const rootGradlePath = path.join(cfg.modRequest.projectRoot, 'android', 'build.gradle');

      // app/build.gradle
      if (fs.existsSync(appGradlePath)) {
        const src = fs.readFileSync(appGradlePath, 'utf8');
        const patched = patchBuildGradle(src);
        if (src !== patched) {
          fs.writeFileSync(appGradlePath, patched);
          console.log('[BashChat Plugin] Patched android/app/build.gradle (compileSdkVersion=35, targetSdkVersion=35, minSdkVersion=24, removed buildToolsVersion).');
        } else {
          console.log('[BashChat Plugin] No changes needed in android/app/build.gradle.');
        }
      }

      // android/build.gradle (defensive cleanup)
      if (fs.existsSync(rootGradlePath)) {
        const rootSrc = fs.readFileSync(rootGradlePath, 'utf8');
        const rootPatched = patchRootBuildGradle(rootSrc);
        if (rootSrc !== rootPatched) {
          fs.writeFileSync(rootGradlePath, rootPatched);
          console.log('[BashChat Plugin] Patched android/build.gradle (removed buildToolsVersion lines).');
        } else {
          console.log('[BashChat Plugin] No changes needed in android/build.gradle.');
        }
      }

      return cfg;
    },
  ]);

  return config;
};