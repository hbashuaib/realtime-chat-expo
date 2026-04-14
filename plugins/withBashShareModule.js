// plugins/withBashShareModule.js
const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withBashShareModule(config) {
  return withAppBuildGradle(config, (config) => {
    if (!config.modResults.contents.includes("project(':bash-share-module')")) {
      config.modResults.contents = config.modResults.contents.replace(
        /dependencies\s*{/,
        `dependencies {\n    implementation project(':bash-share-module')`
      );
    }
    return config;
  });
};


