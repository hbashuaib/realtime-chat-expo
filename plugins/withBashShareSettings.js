// plugins/withBashShareSettings.js
const { withSettingsGradle } = require('@expo/config-plugins');

module.exports = function withBashShareSettings(config) {
  return withSettingsGradle(config, (config) => {
    const includeBlock = `
include ':bash-share-module'
project(':bash-share-module').projectDir = new File(rootProject.projectDir, '../bash-share-module/android')
`;
    if (!config.modResults.contents.includes("include ':bash-share-module'")) {
      config.modResults.contents += includeBlock;
    }
    return config;
  });
};