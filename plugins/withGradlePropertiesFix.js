// plugins/withGradlePropertiesFix.js
const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

module.exports = function withGradlePropertiesFix(config) {
  return withDangerousMod(config, ["android", (cfg) => {
    const propsPath = path.join(cfg.modRequest.platformProjectRoot, "gradle.properties");
    let contents = fs.readFileSync(propsPath, "utf8");

    // Remove deprecated expo.edgeToEdgeEnabled
    contents = contents.replace(/^expo.edgeToEdgeEnabled=.*$/m, "");

    // Ensure Hermes and newArch flags are present
    if (!contents.includes("hermesEnabled=")) {
      contents += "\nhermesEnabled=true\n";
    }
    if (!contents.includes("newArchEnabled=")) {
      contents += "\nnewArchEnabled=true\n";
    }

    fs.writeFileSync(propsPath, contents, "utf8");
    return cfg;
  }]);
};