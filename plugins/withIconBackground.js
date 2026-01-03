const { withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withIconBackground(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const colorsPath = path.join(
        cfg.modRequest.projectRoot,
        "android",
        "app",
        "src",
        "main",
        "res",
        "values",
        "colors.xml"
      );

      let contents = "";
      if (fs.existsSync(colorsPath)) {
        contents = fs.readFileSync(colorsPath, "utf8");
      }

      if (!contents.includes("iconBackground")) {
        // Inject the missing color
        const injection = `  <color name="iconBackground">#FFFFFF</color>\n</resources>`;
        contents = contents.replace("</resources>", injection);
        fs.writeFileSync(colorsPath, contents);
        console.log("✅ Ensured iconBackground color in colors.xml");
      }

      return cfg;
    },
  ]);
}

module.exports = withIconBackground;