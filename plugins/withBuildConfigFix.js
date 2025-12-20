// plugins/withBuildConfigFix.js
const { withAppBuildGradle } = require("@expo/config-plugins");

module.exports = function withBuildConfigFix(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Remove any existing REACT_NATIVE_RELEASE_LEVEL lines
    contents = contents.replace(/buildConfigField\s+"String",\s+"REACT_NATIVE_RELEASE_LEVEL".*?\n/g, "");

    // Append the safe hard-coded line inside defaultConfig block
    const correctLine =
      '        buildConfigField "String", "REACT_NATIVE_RELEASE_LEVEL", "\\"stable\\""\n';

    contents = contents.replace(
      /(defaultConfig\s*{[^}]*)(\n)/,
      `$1\n${correctLine}$2`
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
};