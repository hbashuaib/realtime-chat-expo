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
  <!-- Metro + API for 10.0.2.2 -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">10.0.2.2</domain>
    <trust-anchors>
      <certificates src="system"/>
      <certificates src="user"/>
    </trust-anchors>
  </domain-config>

  <!-- Metro + API for 192.168.3.72 -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">192.168.3.72</domain>
    <trust-anchors>
      <certificates src="system"/>
      <certificates src="user"/>
    </trust-anchors>
  </domain-config>

  <!-- API only for bashchat.local -->
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">bashchat.local</domain>
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