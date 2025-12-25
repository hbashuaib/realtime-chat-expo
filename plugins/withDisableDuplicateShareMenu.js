const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

module.exports = function withDisableDuplicateShareMenu(config) {
  return withDangerousMod(config, ['android', async (cfg) => {
    const badPath = path.join(cfg.modRequest.projectRoot, 'plugins', 'sharemenu', 'ShareMenuActivity.java');
    if (fs.existsSync(badPath)) {
      // Rename or comment out the file so Gradle ignores it
      const renamed = badPath + '.disabled';
      fs.renameSync(badPath, renamed);
      console.log('[Plugin] Disabled duplicate ShareMenuActivity at:', renamed);
    }
    return cfg;
  }]);
};