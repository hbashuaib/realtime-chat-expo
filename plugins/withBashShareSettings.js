// plugins/withBashShareSettings.js
const { withSettingsGradle } = require('@expo/config-plugins');

module.exports = function withBashShareSettings(config) {
  return withSettingsGradle(config, (config) => {
    // ✅ No injection needed — BashSharePackage is registered manually
    return config;
  });
};