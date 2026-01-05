// plugins/withNetworkSecurityConfig.js
console.log("withNetworkSecurityConfig.js loaded");

const {
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

// Write res/xml/network_security_config.xml
function withWriteNetworkSecurityXml(config) {
  return withDangerousMod(config, ["android", async (cfg) => {
    const projectRoot = cfg.modRequest.projectRoot;
    const xmlDir = path.join(
      projectRoot,
      "android",
      "app",
      "src",
      "main",
      "res",
      "xml"
    );
    const xmlPath = path.join(xmlDir, "network_security_config.xml");

    if (!fs.existsSync(xmlDir)) {
      fs.mkdirSync(xmlDir, { recursive: true });
    }

    const xmlContent = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!-- Allow cleartext only for Metro dev server -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">192.168.8.206</domain>
  </domain-config>

  <!-- Enforce HTTPS trust for your API endpoints -->
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">bashchat.local</domain>
    <domain includeSubdomains="true">10.0.2.2</domain>
    <trust-anchors>
      <certificates src="system"/>
      <certificates src="user"/>
    </trust-anchors>
  </domain-config>
</network-security-config>
`;

    fs.writeFileSync(xmlPath, xmlContent, "utf8");
    return cfg;
  }]);
}

// Patch AndroidManifest.xml
function withPatchManifest(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app && app.$) {
      app.$["android:networkSecurityConfig"] = "@xml/network_security_config";
      // Keep cleartext disabled globally; only Metro host is permitted via XML
      app.$["android:usesCleartextTraffic"] = "false";
    }
    return cfg;
  });
}

module.exports = function withNetworkSecurityConfig(config) {
  config = withWriteNetworkSecurityXml(config);
  config = withPatchManifest(config);
  return config;
};