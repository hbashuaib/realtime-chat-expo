// react-native.config.js (at project root)
module.exports = {
  dependencies: {
    "bash-share-module": {
      platforms: {
        android: {
          sourceDir: "./bash-share-module/android",
          packageImportPath: "import com.anonymous.realtimechatexpo.BashSharePackage",
          packageInstance: "BashSharePackage()",
        },
      },
    },
  },
};