// plugins/withBashShareModule.js
const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withBashShareModule(config) {
  return withAppBuildGradle(config, (config) => {
    // ✅ No Gradle dependency injection needed
    // BashSharePackage is registered manually in MainApplication.kt
    return config;
  });
};

