// plugins/withShareMenuFix.js
const fs = require("fs");
const path = require("path");
const {
  withProjectBuildGradle,
  withMainActivity,
  withAndroidManifest,
  withDangerousMod,
} = require("@expo/config-plugins");

const PATCH_START = "// === share-menu sdk override start ===";
const PATCH_END = "// === share-menu sdk override end ===";

// --- Gradle override for react-native-share-menu ---
function getGradlePatchBlock() {
  return `
${PATCH_START}
subprojects {
  if (project.name == "react-native-share-menu" && project.hasProperty("android")) {
    project.android.compileSdkVersion = 35
    project.android.defaultConfig.targetSdkVersion = 35
    project.android.defaultConfig.minSdkVersion = 24
  }
}
${PATCH_END}
`;
}

// --- Ensure imports at top of MainActivity.java (defensive) ---
function ensureImportsAtTop(src) {
  let out = src.replace(/import\s+android\.content\s+Intent/g, "import android.content.Intent");

  const required = [
    "import android.content.Intent",
    "import android.util.Log",
  ];

  out = out.replace(
    /import\s+com\.meedan\.sharemenu\.ShareMenuModule/g,
    "import com.reactnativesharemenu.ShareMenuModule"
  );

  const pkgMatch = out.match(/^package\s+[^\n]+\n/);
  if (!pkgMatch) return out;
  const packageLine = pkgMatch[0];
  const rest = out.slice(packageLine.length);

  const headerMatch = rest.match(/^(?:import\s+[^\n]+\n)+/);
  const currentHeaderImports = headerMatch ? headerMatch[0] : "";
  const headerEndIndex = headerMatch ? packageLine.length + currentHeaderImports.length : packageLine.length;

  const existing = new Set(
    currentHeaderImports
      .split("\n")
      .filter((l) => l.startsWith("import "))
      .map((l) => l.trim())
  );

  const toAdd = required.filter((imp) => !existing.has(imp));
  if (toAdd.length === 0) return out;

  const newHeader =
    packageLine +
    (currentHeaderImports || "") +
    toAdd.map((i) => i + "\n").join("");

  return newHeader + out.slice(headerEndIndex);
}

// --- Force manifest package (defensive) ---
function withManifestPackage(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$.package = "com.anonymous.realtimechatexpo";
    return cfg;
  });
}

// --- Inject ShareMenuActivity + cleanup SEND filters from MainActivity ---
function withShareMenuActivity(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;

    // Remove SEND/SEND_MULTIPLE filters from MainActivity and enforce launchMode/exported
    if (Array.isArray(app.activity)) {
      app.activity = app.activity.map((act) => {
        const name = act.$?.["android:name"] || "";
        const isMain =
          name.endsWith(".MainActivity") ||
          name === "com.anonymous.realtimechatexpo.MainActivity";

        if (!isMain) return act;

        const filters = Array.isArray(act["intent-filter"]) ? act["intent-filter"] : [];
        act["intent-filter"] = filters.filter((f) => {
          const actions = (f.action || []).map((a) => a.$?.["android:name"]);
          return !actions.includes("android.intent.action.SEND") &&
                 !actions.includes("android.intent.action.SEND_MULTIPLE");
        });

        act.$["android:launchMode"] = "singleTask";
        act.$["android:exported"] = act.$["android:exported"] ?? "true";
        return act;
      });
    }

    // Add ShareMenuActivity if missing
    app.activity = app.activity || [];
    const exists = app.activity.some(
      (a) => a.$?.["android:name"] === "com.reactnativesharemenu.ShareMenuActivity"
    );
    if (!exists) {
      app.activity.push({
        $: {
          "android:name": "com.reactnativesharemenu.ShareMenuActivity",
          "android:exported": "true",
          "android:launchMode": "singleTask",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": "android.intent.action.SEND" } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
            data: [{ $: { "android:mimeType": "text/plain" } }],
          },
          {
            action: [{ $: { "android:name": "android.intent.action.SEND" } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
            data: [{ $: { "android:mimeType": "image/*" } }],
          },
          {
            action: [{ $: { "android:name": "android.intent.action.SEND" } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
            data: [{ $: { "android:mimeType": "audio/*" } }],
          },
          {
            action: [{ $: { "android:name": "android.intent.action.SEND" } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
            data: [{ $: { "android:mimeType": "video/*" } }],
          },
          {
            action: [{ $: { "android:name": "android.intent.action.SEND_MULTIPLE" } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
            data: [{ $: { "android:mimeType": "image/*" } }],
          },
          {
            action: [{ $: { "android:name": "android.intent.action.SEND_MULTIPLE" } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
            data: [{ $: { "android:mimeType": "audio/*" } }],
          },
          {
            action: [{ $: { "android:name": "android.intent.action.SEND_MULTIPLE" } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
            data: [{ $: { "android:mimeType": "video/*" } }],
          },
        ],
      });
    }

    return cfg;
  });
}

// --- Normalize MainActivity VIEW filters to a single canonical scheme ---
function withNormalizeMainActivityViewFilters(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest?.application?.[0];
    if (!app || !Array.isArray(app.activity)) return cfg;

    app.activity = app.activity.map((act) => {
      const name = act.$?.["android:name"] || "";
      const isMain =
        name.endsWith(".MainActivity") ||
        name === "com.anonymous.realtimechatexpo.MainActivity";

      if (!isMain) return act;

      const filters = Array.isArray(act["intent-filter"]) ? act["intent-filter"] : [];

      // Keep all non-VIEW filters
      const otherFilters = filters.filter((f) => {
        const actions = (f.action || []).map((a) => a.$?.["android:name"]);
        return !actions.includes("android.intent.action.VIEW");
      });

      // Canonical single VIEW filter with only your scheme
      const canonicalView = {
        action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
        category: [
          { $: { "android:name": "android.intent.category.DEFAULT" } },
          { $: { "android:name": "android.intent.category.BROWSABLE" } },
        ],
        data: [{ $: { "android:scheme": "realtimechatexpo" } }],
      };

      act["intent-filter"] = [...otherFilters, canonicalView];

      // Defensive: enforce singleTask/exported
      act.$["android:launchMode"] = "singleTask";
      act.$["android:exported"] = act.$["android:exported"] ?? "true";

      return act;
    });

    return cfg;
  });
}

// --- Write ShareMenuActivity.java during prebuild ---
function withShareMenuJava(config) {
  return withDangerousMod(config, ["android", (cfg) => {
    const androidDir = cfg.modRequest.platformProjectRoot;
    const javaSrcDir = path.join(
      androidDir,
      "app",
      "src",
      "main",
      "java",
      "com",
      "reactnativesharemenu"
    );
    const destFile = path.join(javaSrcDir, "ShareMenuActivity.java");

    fs.mkdirSync(javaSrcDir, { recursive: true });

    // ReactActivity-based proxy forwards intent to RN
    const contents = `
package com.reactnativesharemenu;

import android.content.Intent;
import android.os.Bundle;
import com.facebook.react.ReactActivity;

public class ShareMenuActivity extends ReactActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setIntent(getIntent());
  }

  @Override
  protected String getMainComponentName() {
    return "main";
  }

  @Override
  public void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
  }
}
`;
    fs.writeFileSync(destFile, contents, "utf8");
    return cfg;
  }]);
}

// --- Export: apply all fixes in safe order ---
module.exports = function withShareMenuFix(config) {
  // 1) Gradle override for react-native-share-menu
  config = withProjectBuildGradle(config, (cfg) => {
    const gradle = cfg.modResults;
    if (gradle.language !== "groovy") return cfg;
    const contents = gradle.contents || "";
    if (!contents.includes(PATCH_START)) {
      gradle.contents = `${contents.trim()}\n\n${getGradlePatchBlock()}\n`;
    }
    return cfg;
  });

  // 2) Defensive import fix in MainActivity.java
  config = withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;
    src = ensureImportsAtTop(src);
    cfg.modResults.contents = src;
    return cfg;
  });

  // 3) Force manifest package
  config = withManifestPackage(config);

  // 4) Inject ShareMenuActivity + cleanup SEND filters on MainActivity
  config = withShareMenuActivity(config);

  // 5) Normalize MainActivity VIEW filters to a single canonical scheme
  config = withNormalizeMainActivityViewFilters(config);

  // 6) Ensure ShareMenuActivity.java exists
  config = withShareMenuJava(config);

  return config;
};