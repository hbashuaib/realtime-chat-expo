// app.plugin.js
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function patchAppBuildGradle(src) {
  let updated = src;

  // --- Fix A: Hardcode SDK versions ---
  // Replace compileSdkVersion line
  updated = updated.replace(/compileSdk(?:Version)?\s+\S+/, "compileSdkVersion 35");
  // Replace minSdkVersion line
  updated = updated.replace(/minSdkVersion\s+\S+/, "minSdkVersion 24");
  // Replace targetSdkVersion line
  updated = updated.replace(/targetSdkVersion\s+\S+/, "targetSdkVersion 35");
  // Replace buildToolsVersion line if present
  updated = updated.replace(/buildToolsVersion\s+\S+/, 'buildToolsVersion "35.0.0"');

  // Ensure buildConfigField
  if (!updated.includes("REACT_NATIVE_RELEASE_LEVEL")) {
    updated = updated.replace(
      /defaultConfig\s*{[^}]*}/m,
      (match) =>
        match.replace(
          /versionName.*\n/,
          `$&        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL", "\"\${findProperty('reactNativeReleaseLevel') ?: 'stable'}\""\n`
        )
    );
  }

  // --- Fix B: Add Kotlin sourceSets ---
  if (!updated.includes("sourceSets {")) {
    updated = updated.replace(
      /android\s*{/,
      `android {
    sourceSets {
        main { java.srcDirs = ['src/main/java', 'src/main/kotlin'] }
        debug { java.srcDirs = ['src/main/java', 'src/main/kotlin'] }
        release { java.srcDirs = ['src/main/java', 'src/main/kotlin'] }
    }

    `
    );
  }

  // Ensure dependencies
  if (!updated.includes("project(':bash-share-module')")) {
    updated = updated.replace(
      /dependencies\s*{/,
      `dependencies {\n    implementation project(':bash-share-module')`
    );
  }
  if (!updated.includes("kotlin-stdlib")) {
    updated = updated.replace(
      /implementation\("com.facebook.react:react-android"\)/,
      `implementation("com.facebook.react:react-android")\n    implementation "org.jetbrains.kotlin:kotlin-stdlib:2.0.21"`
    );
  }
  if (!updated.includes("appcompat")) {
    updated = updated.replace(
      /implementation "org.jetbrains.kotlin:kotlin-stdlib:2.0.21"/,
      `implementation "org.jetbrains.kotlin:kotlin-stdlib:2.0.21"\n    implementation "androidx.appcompat:appcompat:1.6.1"`
    );
  }

  return updated;
}

module.exports = function withAndroidGradleFix(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const appGradlePath = path.join(
        cfg.modRequest.projectRoot,
        "android",
        "app",
        "build.gradle"
      );

      if (fs.existsSync(appGradlePath)) {
        const src = fs.readFileSync(appGradlePath, "utf8");
        const patched = patchAppBuildGradle(src);
        fs.writeFileSync(appGradlePath, patched);
        console.log("[BashChat Plugin] Patched android/app/build.gradle (SDK versions + sourceSets)");
      }

      return cfg;
    },
  ]);
};