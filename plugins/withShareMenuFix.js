// plugins/withShareMenuFix.js
const { withProjectBuildGradle } = require("@expo/config-plugins");

const PATCH_START = "// === share-menu sdk override start ===";
const PATCH_END = "// === share-menu sdk override end ===";

function getPatchBlock() {
  return `
${PATCH_START}
subprojects {
  afterEvaluate { project ->
    // Apply only to the react-native-share-menu subproject
    if (project.name == "react-native-share-menu" && project.hasProperty("android")) {
      // Set SDK versions directly on the android extension
      project.android.compileSdkVersion = 35
      project.android.defaultConfig.targetSdkVersion = 35
      project.android.defaultConfig.minSdkVersion = 24
    }
  }
}
${PATCH_END}
`;
}

module.exports = function withShareMenuFix(config) {
  return withProjectBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults;
    if (gradle.language !== "groovy") return cfg;

    const contents = gradle.contents || "";
    // Prevent duplicate insertion
    if (!contents.includes(PATCH_START)) {
      gradle.contents = `${contents.trim()}\n\n${getPatchBlock()}\n`;
    }
    return cfg;
  });
};