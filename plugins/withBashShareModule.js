// plugins/withBashShareModule.js
const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withBashShareModule(config) {
  return withAppBuildGradle(config, (config) => {
    if (config.modResults.language === "groovy") {
      const dependencyLine = `    implementation project(':bash-share-module')`;
      if (!config.modResults.contents.includes(dependencyLine)) {
        // Find the dependencies block and insert safely
        config.modResults.contents = config.modResults.contents.replace(
          /dependencies\s*{([\s\S]*?)}/,
          (match, inner) => `dependencies {\n${inner}\n${dependencyLine}\n}`,
        );
      }
    }
    return config;
  });
};
