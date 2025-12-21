// plugins/withShareMenuFix.js
console.log("withShareMenuFix.js loaded"); 

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
    "import com.meedan.sharemenu.ShareMenuModule"
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
  console.log("withManifestPackage fired");
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$ = manifest.$ || {};
    manifest.$.package = "com.anonymous.realtimechatexpo";
    return cfg;
  });
}

// --- Inject ShareMenuActivity + cleanup SEND filters from MainActivity ---
function withShareMenuActivity(config) {  
  console.log("withShareMenuActivity fired");
  return withAndroidManifest(config, (cfg) => {
    // Always log when the mod runs
    console.log("withShareMenuActivity firing…");

    const manifest = cfg.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) {
      console.log("No <application> node found in manifest");
      return cfg;
    }

    // Log current activities
    console.log(
      "Activities before mutation:",
      (app.activity || []).map(a => a.$?.["android:name"])
    );

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

    // Always push removal stub for library activity
    app.activity = (app.activity || []).filter(
      (a) => a.$?.["android:name"] !== "com.meedan.sharemenu.ShareMenuActivity"
    );
    app.activity.push({
      $: {
        "android:name": "com.meedan.sharemenu.ShareMenuActivity",
        "tools:node": "remove",
      },
    });

    // Add your custom ShareMenuActivity if missing
    const exists = (app.activity || []).some(
      (a) =>
        a.$?.["android:name"] === "com.anonymous.realtimechatexpo.ShareMenuActivity" ||
        a.$?.["android:name"] === ".ShareMenuActivity"
    );
    if (!exists) {
      app.activity.push({
        $: {
          "android:name": "com.anonymous.realtimechatexpo.ShareMenuActivity",
          "android:exported": "true",
          "android:launchMode": "singleTop",
          "android:grantUriPermissions": "true",
        },
        "intent-filter": [
          // Single item
          { action:[{ $:{ "android:name":"android.intent.action.SEND"}}],
            category:[{ $:{ "android:name":"android.intent.category.DEFAULT"}}],
            data:[{ $:{ "android:mimeType":"text/plain"}}] },
          { action:[{ $:{ "android:name":"android.intent.action.SEND"}}],
            category:[{ $:{ "android:name":"android.intent.category.DEFAULT"}}],
            data:[{ $:{ "android:mimeType":"image/*"}}] },
          { action:[{ $:{ "android:name":"android.intent.action.SEND"}}],
            category:[{ $:{ "android:name":"android.intent.category.DEFAULT"}}],
            data:[{ $:{ "android:mimeType":"audio/*"}}] },
          { action:[{ $:{ "android:name":"android.intent.action.SEND"}}],
            category:[{ $:{ "android:name":"android.intent.category.DEFAULT"}}],
            data:[{ $:{ "android:mimeType":"video/*"}}] },
          // Multiple items
          { action:[{ $:{ "android:name":"android.intent.action.SEND_MULTIPLE"}}],
            category:[{ $:{ "android:name":"android.intent.category.DEFAULT"}}],
            data:[{ $:{ "android:mimeType":"text/*"}}] },
          { action:[{ $:{ "android:name":"android.intent.action.SEND_MULTIPLE"}}],
            category:[{ $:{ "android:name":"android.intent.category.DEFAULT"}}],
            data:[{ $:{ "android:mimeType":"image/*"}}] },
          { action:[{ $:{ "android:name":"android.intent.action.SEND_MULTIPLE"}}],
            category:[{ $:{ "android:name":"android.intent.category.DEFAULT"}}],
            data:[{ $:{ "android:mimeType":"audio/*"}}] },
          { action:[{ $:{ "android:name":"android.intent.action.SEND_MULTIPLE"}}],
            category:[{ $:{ "android:name":"android.intent.category.DEFAULT"}}],
            data:[{ $:{ "android:mimeType":"video/*"}}] },
        ],
      });
    }

    // Log final activities
    console.log(
      "Activities after mutation:",
      (app.activity || []).map(a => a.$?.["android:name"])
    );

    return cfg;
  });
}

// --- Normalize MainActivity VIEW filters to a single canonical scheme ---
function withNormalizeMainActivityViewFilters(config) {
  console.log("withNormalizeMainActivityViewFilters fired");
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
function withShareMenuActivitySource(config) {
  console.log("withShareMenuActivitySource fired");
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const androidDir = cfg.modRequest.platformProjectRoot;
      const appPkg = "com.anonymous.realtimechatexpo";

      const javaSrcDir = path.join(
        androidDir, "app", "src", "main", "java", ...appPkg.split(".")
      );
      const destFile = path.join(javaSrcDir, "ShareMenuActivity.java");

      const contents = `package ${appPkg};

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

public class ShareMenuActivity extends Activity {
  private static final String TAG = "ShareMenuActivity";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    Intent incoming = getIntent();
    if (incoming == null) {
      Log.w(TAG, "No incoming intent");
      finish();
      return;
    }

    Log.d(TAG, "action=" + incoming.getAction());
    Log.d(TAG, "type=" + incoming.getType());
    Log.d(TAG, "data=" + incoming.getData());
    Log.d(TAG, "extras=" + (incoming.getExtras() != null ? incoming.getExtras().toString() : "null"));

    Intent main = new Intent(this, MainActivity.class);
    main.setAction(incoming.getAction());
    main.setType(incoming.getType());
    main.setData(incoming.getData());
    if (incoming.getExtras() != null) {
      main.putExtras(incoming.getExtras());
    }
    main.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP
      | Intent.FLAG_ACTIVITY_CLEAR_TOP
      | Intent.FLAG_GRANT_READ_URI_PERMISSION);

    startActivity(main);
    finish();
  }
}
`;
      fs.mkdirSync(javaSrcDir, { recursive: true });
      fs.writeFileSync(destFile, contents, "utf8");
      return cfg;
    },
  ]);
}

// --- Ensure ShareMenuActivity.java exists ---
function withMainActivityInboundHandling(config) {
  console.log("withMainActivityInboundHandling fired");
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;

    // Ensure imports
    src = ensureImportsAtTop(src);
    if (!/import\s+android\.util\.Log/.test(src)) {
      src = src.replace(/(^package[^\n]+\n)/, `$1import android.util.Log\n`);
    }

    // Add TAG
    if (!/private\s+val\s+TAG\s*=/.test(src)) {
      src = src.replace(
        /class\s+MainActivity\s*:\s*ReactActivity\s*\{/,
        `class MainActivity : ReactActivity() {\n  private val TAG = "MainActivity"\n`
      );
    }

    // Add helper
    if (!/fun\s+handleInboundShareIntent\(/.test(src)) {
      src = src.replace(
        /override\s+fun\s+invokeDefaultOnBackPressed[\s\S]*?\}\s*$/,
        `private fun handleInboundShareIntent(intent: Intent?, source: String) {
    if (intent == null) return
    val action = intent.action
    val type = intent.type
    val data = intent.data
    val extras = intent.extras
    Log.d(TAG, "[Inbound] source=$source action=$action type=$type data=$data extras=$extras")
  }

  $&
`
      );
    }

    // Add onNewIntent
    if (!/override\s+fun\s+onNewIntent\(/.test(src)) {
      src = src.replace(
        /override\s+fun\s+getMainComponentName\([\s\S]*?}\s*/,
        `$&
  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    if (intent == null) {
      Log.w(TAG, "onNewIntent: null intent")
      return
    }
    setIntent(intent)
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    handleInboundShareIntent(intent, source = "onNewIntent")
  }
`
      );
    }

    // Log cold start intent in onCreate
    if (!/handleInboundShareIntent\(intent,\s*source\s*=\s*"onCreate"\)/.test(src)) {
      src = src.replace(
        /override\s+fun\s+onCreate\([\s\S]*?super\.onCreate\(null\)[\s\S]*?\n/,
        (m) => m + `  handleInboundShareIntent(intent, source = "onCreate")\n`
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}

// --- Export: apply all fixes in safe order ---
module.exports = function withShareMenuFix(config) {
  console.log("withShareMenuFix function executing");  // <-- proves Expo called this function

  // 1) Gradle override (keep)
  config = withProjectBuildGradle(config, (cfg) => {
    console.log("withProjectBuildGradle exported");
    const gradle = cfg.modResults;
    if (gradle.language !== "groovy") return cfg;
    const contents = gradle.contents || "";
    if (!contents.includes(PATCH_START)) {
      gradle.contents = `${contents.trim()}\n\n${getGradlePatchBlock()}\n`;
    }
    return cfg;
  });

  // 2) Defensive import fix in MainActivity (keep)
  config = withMainActivity(config, (cfg) => {
    console.log("withMainActivity exported");
    let src = cfg.modResults.contents;
    src = ensureImportsAtTop(src);
    cfg.modResults.contents = src;
    return cfg;
  });

  // 3) Force manifest package (keep)
  config = withManifestPackage(config);

  // 4) Inject your app ShareMenuActivity + filters + grantUriPermissions
  config = withShareMenuActivity(config);

  // 5) Normalize MainActivity VIEW filters (keep)
  config = withNormalizeMainActivityViewFilters(config);

  // 6) Inject MainActivity onNewIntent + logging
  config = withMainActivityInboundHandling(config);

  // 7) Write ShareMenuActivity.java into your app package
  config = withShareMenuActivitySource(config);

  return config;

};