// app.plugin.js
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function forceCompileSdk(content) {
  // Replace both "compileSdk ..." and "compileSdkVersion ..."
  // Works even if someone writes "compileSdk rootProject.ext.compileSdkVersion"
  return content.replace(
    /^\s*compileSdk(?:Version)?\s+.*$/m,
    "    compileSdkVersion 35",
  );
}

function stripBuildTools(content) {
  // Remove any buildToolsVersion lines
  return content.replace(/^\s*buildToolsVersion\s+.*\n/gm, "");
}

// Normalize defaultConfig block
function normalizeDefaultConfigBlock(content) {
  return content.replace(/defaultConfig\s*\{([\s\S]*?)\}/m, (match, inner) => {
    let block = inner;

    // Normalize min/target SDK
    block = block.replace(
      /^\s*minSdkVersion\s+.*$/gm,
      "        minSdkVersion 24",
    );
    block = block.replace(
      /^\s*targetSdkVersion\s+.*$/gm,
      "        targetSdkVersion 35",
    );

    // Remove any existing REACT_NATIVE_RELEASE_LEVEL lines
    block = block.replace(
      /^\s*buildConfigField\s+"String",\s+"REACT_NATIVE_RELEASE_LEVEL".*$/gm,
      "",
    );

    // Add one clean buildConfigField line
    block =
  block.trim() +
  '\n        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL", "\"${findProperty(\'reactNativeReleaseLevel\') ?: \'stable\'}\""';

    return `defaultConfig {\n${block}\n}`;
  });
}

// NEW helper to inject AppCompat
function ensureAppCompatDependency(content) {
  if (content.includes("androidx.appcompat:appcompat")) return content;
  return content.replace(
    /implementation\("com.facebook.react:react-android"\)/,
    `implementation("com.facebook.react:react-android")\n    implementation("androidx.appcompat:appcompat:1.6.1")`,
  );
}

// NEW helper to ensure sourceSets block exists
function ensureSourceSets(content) {
  if (content.includes("sourceSets {")) return content;
  return content.replace(
    /android\s*\{/,
    `android {
    sourceSets {
        main {
            java.srcDirs = ['src/main/java', 'src/main/kotlin']
        }
        debug {
            java.srcDirs = ['src/main/java', 'src/main/kotlin']
        }
        release {
            java.srcDirs = ['src/main/java', 'src/main/kotlin']
        }
    }

    `,
  );
}

// NEW helper to inject Kotlin plugin at top of app/build.gradle
function ensureKotlinPlugin(content) {
  if (content.includes("org.jetbrains.kotlin.android")) return content;
  return content.replace(
    /apply plugin: "com.android.application"/,
    `apply plugin: "com.android.application"\napply plugin: "org.jetbrains.kotlin.android"`,
  );
}

// NEW helper to inject Kotlin stdlib dependency
function ensureKotlinStdlibDependency(content) {
  if (content.includes("org.jetbrains.kotlin:kotlin-stdlib")) return content;
  return content.replace(
    /implementation\("com.facebook.react:react-android"\)/,
    `implementation("com.facebook.react:react-android")\n    implementation "org.jetbrains.kotlin:kotlin-stdlib:2.0.21"`,
  );
}

// Helper to fix Fresco dependencies + bash-share-module
function fixFrescoAndShareModule(content) {
  // Ensure the def lines exist above dependencies (after jscFlavor)
  if (!content.includes("def isGifEnabled")) {
    content = content.replace(
      /def jscFlavor.*\n/,
      `$&

def isGifEnabled = (findProperty('expo.gif.enabled') ?: "") == "true"
def isWebpEnabled = (findProperty('expo.webp.enabled') ?: "") == "true"
def isWebpAnimatedEnabled = (findProperty('expo.webp.animated') ?: "") == "true"
`,
    );
  }

  // Ensure Kotlin stdlib
  if (!content.includes("org.jetbrains.kotlin:kotlin-stdlib")) {
    content = content.replace(
      /implementation\("com.facebook.react:react-android"\)/,
      `implementation("com.facebook.react:react-android")\n    implementation "org.jetbrains.kotlin:kotlin-stdlib:2.0.21"`,
    );
  }

  // Ensure AppCompat
  if (!content.includes("androidx.appcompat:appcompat")) {
    content = content.replace(
      /implementation "org.jetbrains.kotlin:kotlin-stdlib:2.0.21"/,
      `implementation "org.jetbrains.kotlin:kotlin-stdlib:2.0.21"\n    implementation("androidx.appcompat:appcompat:1.6.1")`,
    );
  }

  // Ensure bash-share-module dependency
  if (!content.includes("project(':bash-share-module')")) {
    content = content.replace(
      /dependencies\s*\{/,
      `dependencies {\n    implementation project(':bash-share-module')`,
    );
  }

  // Ensure Fresco flags usage (only add if missing)
  if (
    !content.includes('implementation("com.facebook.fresco:animated-gif') &&
    !content.includes('implementation("com.facebook.fresco:webpsupport')
  ) {
    content = content.replace(
      /implementation project\(':bash-share-module'\)/,
      `implementation project(':bash-share-module')\n    if (isGifEnabled) {\n        implementation("com.facebook.fresco:animated-gif:${expoLibs.versions.fresco.get()}")\n    }\n    if (isWebpEnabled) {\n        implementation("com.facebook.fresco:webpsupport:${expoLibs.versions.fresco.get()}")\n        if (isWebpAnimatedEnabled) {\n            implementation("com.facebook.fresco:animated-webp:${expoLibs.versions.fresco.get()}")\n        }\n    }`,
    );
  }

  return content;
}

// NEW helper to ensure Kotlin version + classpath in root build.gradle
function ensureKotlinRoot(content) {
  if (content.includes("org.jetbrains.kotlin:kotlin-gradle-plugin")) {
    // Already has plugin, but check for version
    if (!content.includes("ext {") || !content.includes("kotlinVersion")) {
      content = content.replace(
        /buildscript\s*{([\s\S]*?)repositories/m,
        (match, inner) => {
          return `buildscript {\n    ext { kotlinVersion = '2.0.21' }\n${inner}repositories`;
        },
      );
    }
    if (!content.includes("kotlin-gradle-plugin:$kotlinVersion")) {
      content = content.replace(
        /classpath\('org.jetbrains.kotlin:kotlin-gradle-plugin'\)/,
        `classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")`,
      );
    }
    return content;
  }
  return content;
}

// Main patching function for android/app/build.gradle
function patchAppBuildGradle(content) {
  let updated = content;

  // 1) Remove buildToolsVersion lines
  updated = stripBuildTools(updated);

  // 2) Force compileSdkVersion 35
  updated = forceCompileSdk(updated);

  // 3) Normalize defaultConfig (min/target)
  updated = normalizeDefaultConfigBlock(updated);

  // 4) Ensure AppCompat is present
  updated = ensureAppCompatDependency(updated);

  // 5) Ensure sourceSets block is present
  updated = ensureSourceSets(updated);

  // 6) Ensure Kotlin plugin and stdlib dependency
  updated = ensureKotlinPlugin(updated);

  // 7) Ensure Kotlin stdlib dependency
  updated = ensureKotlinStdlibDependency(updated);

  // 8) Fix Fresco + bash-share-module dependency block
  updated = fixFrescoAndShareModule(updated);

  return updated;
}

function patchRootBuildGradle(content) {
  let updated = content;
  updated = stripBuildTools(updated); // existing cleanup
  updated = ensureKotlinRoot(updated); // NEW injection
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
        "build.gradle",
      );
      const rootGradlePath = path.join(
        cfg.modRequest.projectRoot,
        "android",
        "build.gradle",
      );

      // Patch android/app/build.gradle
      if (fs.existsSync(appGradlePath)) {
        const src = fs.readFileSync(appGradlePath, "utf8");
        const patched = patchAppBuildGradle(src);

        if (src !== patched) {
          fs.writeFileSync(appGradlePath, patched);
          console.log(
            "[BashChat Plugin] Patched android/app/build.gradle: compileSdkVersion=35, minSdkVersion=24, targetSdkVersion=35, removed buildToolsVersion/rootProject.ext duplicates.",
          );
          // Optional debug: show first lines for sanity
          const preview = patched.split("\n").slice(0, 50).join("\n");
          console.log(
            "[BashChat Plugin] app/build.gradle preview (first 50 lines):\n" +
              preview,
          );
        } else {
          console.log(
            "[BashChat Plugin] No changes needed in android/app/build.gradle.",
          );
        }
      } else {
        console.log("[BashChat Plugin] android/app/build.gradle not found.");
      }

      // Patch android/build.gradle (defensive cleanup + Kotlin injection)
      if (fs.existsSync(rootGradlePath)) {
        const rootSrc = fs.readFileSync(rootGradlePath, "utf8");
        const rootPatched = patchRootBuildGradle(rootSrc);

        if (rootSrc !== rootPatched) {
          fs.writeFileSync(rootGradlePath, rootPatched);
          console.log(
            "[BashChat Plugin] Patched android/build.gradle: added kotlinVersion + classpath, removed buildToolsVersion lines.",
          );
          const preview = rootPatched.split("\n").slice(0, 30).join("\n");
          console.log(
            "[BashChat Plugin] root build.gradle preview (first 30 lines):\n" +
              preview,
          );
        } else {
          console.log(
            "[BashChat Plugin] No changes needed in android/build.gradle.",
          );
        }
      } else {
        console.log("[BashChat Plugin] android/build.gradle not found.");
      }

      return cfg;
    },
  ]);
};
