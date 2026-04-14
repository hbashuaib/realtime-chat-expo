// plugins/withBashShareSettings.js
const { withSettingsGradle } = require('@expo/config-plugins');

module.exports = function withBashShareSettings(config) {
  return withSettingsGradle(config, (config) => {
    if (!config.modResults.contents.includes("include ':bash-share-module'")) {
      config.modResults.contents += `
include ':bash-share-module'
project(':bash-share-module').projectDir = new File(rootProject.projectDir, '../bash-share-module/android')
`;
    }
    return config;
  });
};
