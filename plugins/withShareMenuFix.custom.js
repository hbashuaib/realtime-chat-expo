// plugins/withShareMenuFix.js
console.log("withShareMenuFix.js loaded"); 

const {  
  withProjectBuildGradle,
  withMainActivity,
  withAndroidManifest,
  withDangerousMod,
  withAppBuildGradle,
} = require("@expo/config-plugins");

const fs = require("fs");
const path = require("path");

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

// --- Disable shrinking in debug builds ---
function withDebugNoMinify(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;

    // Ensure buildTypes.debug { minifyEnabled false }
    if (/buildTypes\s*\{/.test(src)) {
      src = src.replace(/buildTypes\s*\{[\s\S]*?\}/, (block) => {
        if (/debug\s*\{[\s\S]*?minifyEnabled\s+false/.test(block)) return block;
        return block.replace(/debug\s*\{[\s\S]*?\}/, (dbg) => {
          return dbg.includes("minifyEnabled")
            ? dbg.replace(/minifyEnabled\s+\w+/, "minifyEnabled false")
            : dbg.replace(/\{/, "{\n      minifyEnabled false");
        });
      });
    } else {
      src += `
android {
  buildTypes {
    debug { minifyEnabled false }
  }
}
`;
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}

// --- Inject ProGuard keep rules for release builds ---
function withProguardKeeps(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const appDir = path.join(cfg.modRequest.platformProjectRoot, "app");
      const rulesPath = path.join(appDir, "proguard-rules.pro");
      const rules = `
-keep class com.anonymous.realtimechatexpo.ShareMenuActivity { *; }
-keep class com.anonymous.realtimechatexpo.MainActivity { *; }
`;
      fs.writeFileSync(rulesPath, rules, "utf8");
      return cfg;
    },
  ]);
}


function wireProguardInBuildGradle(config) {
  return withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;
    // Ensure release references proguard-rules.pro
    src = src.replace(/release\s*\{[\s\S]*?\}/, (rel) => {
      let block = rel;
      if (!/proguardFiles/.test(block)) {
        block = block.replace(
          /\{/,
          "{\n      proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'"
        );
      }
      return block;
    });
    cfg.modResults.contents = src;
    return cfg;
  });
}

// --- Write ShareMenuActivityCanary.java during prebuild ---
function withCanaryActivitySource(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const androidDir = cfg.modRequest.platformProjectRoot;
      const appPkg = "com.anonymous.realtimechatexpo";

      const javaSrcDir = path.join(
        androidDir, "app", "src", "main", "java", ...appPkg.split(".")
      );
      const destFile = path.join(javaSrcDir, "ShareMenuActivityCanary.java");

      const contents = `package ${appPkg};

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

public class ShareMenuActivityCanary extends Activity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    Log.i("BashChatShare", "CANARY onCreate fired");
    Toast.makeText(this, "Share received (Canary)", Toast.LENGTH_SHORT).show();
    finish();
  }
}
`;

      fs.mkdirSync(javaSrcDir, { recursive: true });
      const existing = fs.existsSync(destFile) ? fs.readFileSync(destFile, "utf8") : "";
      if (existing !== contents) {
        fs.writeFileSync(destFile, contents, "utf8");
      }
      return cfg;
    },
  ]);
}


// --- Ensure imports at top of MainActivity.java (defensive) ---
function ensureImportsAtTop(src) {
  let out = src.replace(/import\s+android\.content\s+Intent/g, "import android.content.Intent");

  const required = [
    "import android.content.Intent",
    "import android.util.Log",
    "import android.net.Uri",
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

    // Ensure package and tools namespace for manifest mutations
    manifest.$.package = "com.anonymous.realtimechatexpo";
    manifest.$["xmlns:tools"] = manifest.$["xmlns:tools"] || "http://schemas.android.com/tools";

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
      (app.activity || []).map((a) => a.$?.["android:name"])
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
          return (
            !actions.includes("android.intent.action.SEND") &&
            !actions.includes("android.intent.action.SEND_MULTIPLE")
          );
        });

        act.$["android:launchMode"] = "singleTask";
        act.$["android:exported"] = act.$["android:exported"] ?? "true";
        return act;
      });
    }

    // Remove ALL existing ShareMenuActivity entries (your app + library)
    app.activity = (app.activity || []).filter(
      (a) =>
        ![
          "com.anonymous.realtimechatexpo.ShareMenuActivity",
          ".ShareMenuActivity",
          "com.meedan.sharemenu.ShareMenuActivity",
        ].includes(a.$?.["android:name"])
    );

    // Inject exactly one ShareMenuActivity with clean filters
    app.activity.push({
      $: {
        "android:name": "com.anonymous.realtimechatexpo.ShareMenuActivity",
        "android:exported": "true",
        "android:enabled": "true",
        "android:launchMode": "singleTask",
        "android:grantUriPermissions": "true",
        "android:theme": "@android:style/Theme.Translucent.NoTitleBar",
      },
      "intent-filter": [
        // Text share
        {
          action: [{ $: { "android:name": "android.intent.action.SEND" } }],
          category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
          data: [{ $: { "android:mimeType": "text/plain" } }],
        },
        // Single image share
        {
          action: [{ $: { "android:name": "android.intent.action.SEND" } }],
          category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
          data: [
            { $: { "android:mimeType": "image/*" } },
            { $: { "android:mimeType": "image/jpeg" } },
            { $: { "android:mimeType": "image/png" } },
          ],
        },
        // Multiple images share
        {
          action: [{ $: { "android:name": "android.intent.action.SEND_MULTIPLE" } }],
          category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
          data: [
            { $: { "android:mimeType": "image/*" } },
            { $: { "android:mimeType": "image/jpeg" } },
            { $: { "android:mimeType": "image/png" } },
          ],
        },
      ],
    });

    // 👉 New Canary Activity push
    app.activity.push({
      $: {
        "android:name": "com.anonymous.realtimechatexpo.ShareMenuActivityCanary",
        "android:exported": "true",
        "android:enabled": "true",
        "android:theme": "@android:style/Theme.Translucent.NoTitleBar",
      },
      "intent-filter": [
        {
          action: [{ $: { "android:name": "android.intent.action.SEND" } }],
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
          ],
          data: [{ $: { "android:mimeType": "text/plain" } }],
        },
      ],
    });

    // Log final activities
    console.log(
      "Activities after mutation:",
      (app.activity || []).map((a) => a.$?.["android:name"])
    );

    const last = app.activity[app.activity.length - 1];
    console.log(
      "[Manifest] Filters detail:",
      JSON.stringify(last?.["intent-filter"], null, 2)
    );

    console.log(
      "[Manifest] Injected ShareMenuActivity and Canary activity with filters"
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
      import android.net.Uri;

      import java.util.ArrayList;

      public class ShareMenuActivity extends Activity {
        private static final String TAG = "BashChatShare";

        @Override
        protected void onCreate(Bundle savedInstanceState) {
          try {
            Log.i(TAG, ">>> ShareMenuActivity.onCreate() ENTER <<<");
            super.onCreate(savedInstanceState);
            Log.i(TAG, "=== ShareMenuActivity INVOKED by system ===");

            Intent incoming = getIntent();
            if (incoming == null) {
              Log.w(TAG, "No incoming intent");
              finish();
              return;
            }

            Log.i(TAG, "=== ShareMenuActivity START ===");
            Log.i(TAG, "Incoming action=" + incoming.getAction());
            Log.i(TAG, "Incoming type=" + incoming.getType());
            Log.i(TAG, "Incoming data=" + incoming.getData());
            Log.i(TAG, "Incoming clipData=" + incoming.getClipData());
            Log.i(TAG, "Incoming extras=" + (incoming.getExtras() != null ? incoming.getExtras().toString() : "null"));

            Intent main = new Intent(this, MainActivity.class);
            main.setAction(incoming.getAction());
            main.setType(incoming.getType());
            main.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP
              | Intent.FLAG_ACTIVITY_CLEAR_TOP
              | Intent.FLAG_ACTIVITY_NEW_TASK
              | Intent.FLAG_GRANT_READ_URI_PERMISSION);

            if (incoming.getData() != null) main.setData(incoming.getData());
            if (incoming.getClipData() != null) main.setClipData(incoming.getClipData());
            if (incoming.getExtras() != null) main.putExtras(incoming.getExtras());

            if (Intent.ACTION_SEND.equals(incoming.getAction())) {
              final Uri single = incoming.getParcelableExtra(Intent.EXTRA_STREAM);
              final String text = incoming.getStringExtra(Intent.EXTRA_TEXT);
              Log.i(TAG, "Forward SEND single=" + single + " text=" + text);
              if (single != null) main.putExtra(Intent.EXTRA_STREAM, single);
              if (text != null) main.putExtra(Intent.EXTRA_TEXT, text);
            } else if (Intent.ACTION_SEND_MULTIPLE.equals(incoming.getAction())) {
              final java.util.ArrayList<Uri> list = incoming.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
              Log.i(TAG, "Forward SEND_MULTIPLE list=" + list);
              if (list != null) main.putParcelableArrayListExtra(Intent.EXTRA_STREAM, list);
            } else {
              Log.i(TAG, "Forward unhandled action=" + incoming.getAction());
            }

            Log.i(TAG, "Starting MainActivity with forwarded intent");
            startActivity(main);
            finish(); // ensure clean handoff

            Log.i(TAG, ">>> ShareMenuActivity.onCreate() EXIT <<<");

          } catch (Throwable t) {
            Log.e(TAG, "!!! ShareMenuActivity.onCreate() CRASHED !!!", t);
            finish();
          }
        }

        @Override
        protected void onNewIntent(Intent intent) {
          super.onNewIntent(intent);
          Log.i(TAG, ">>> ShareMenuActivity.onNewIntent() ENTER <<<");
          if (intent != null) {
            Log.i(TAG, "Action=" + intent.getAction() + " Type=" + intent.getType());
            Log.i(TAG, "ClipData=" + intent.getClipData());
            Log.i(TAG, "DataUri=" + intent.getData());
            final Bundle extras = intent.getExtras();
            Log.i(TAG, "Extras=" + (extras != null ? extras.keySet().toString() : "null"));
          }
          Log.i(TAG, ">>> ShareMenuActivity.onNewIntent() EXIT <<<");
        }
      }
      `;

      fs.mkdirSync(javaSrcDir, { recursive: true });
      const existing = fs.existsSync(destFile) ? fs.readFileSync(destFile, "utf8") : "";
      if (existing !== contents) {
        fs.writeFileSync(destFile, contents, "utf8");
      }
      return cfg;
    },
  ]);
}


// --- Ensure Share intents are handled in MainActivity (robust injection) ---
function withMainActivityInboundHandling(config) {  
  console.log("withMainActivityInboundHandling fired");
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;

    // 1) Ensure imports (Intent, Uri, Log)
    src = ensureImportsAtTop(src);
    if (!/import\s+android\.util\.Log/.test(src)) {
      src = src.replace(/(^package[^\n]+\n)/, `$1import android.util.Log\n`);
    }

    // 2) Ensure companion object TAG defined in class
    if (!/companion\s+object\s*{[^}]*TAG/.test(src)) {
      src = src.replace(
        /class\s+MainActivity[^{]*\{/,
        `class MainActivity : ReactActivity() {\n  companion object { private const val TAG = "MainActivity" }\n`
      );
    }

    // 3) Ensure handleInboundShareIntent helper exists
    const helperBlock = `
  private fun handleInboundShareIntent(intent: Intent?, source: String) {
    if (intent == null) return
    val action = intent.action
    val type = intent.type
    val data = intent.data
    val extras = intent.extras

    val text = intent.getStringExtra(Intent.EXTRA_TEXT)
    val singleStream = intent.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
    val multipleStreams = intent.getParcelableArrayListExtra<Uri>(Intent.EXTRA_STREAM)

    Log.i("BashChatShare", "[Inbound] source=$source action=$action type=$type data=$data extras=$extras")
    Log.i("BashChatShare", "[Inbound] EXTRA_TEXT=$text EXTRA_STREAM_SINGLE=$singleStream EXTRA_STREAM_LIST=$multipleStreams")
  }
`;
    if (!/fun\s+handleInboundShareIntent\(/.test(src)) {
      const closeIdx = src.lastIndexOf("\n}");
      src = src.slice(0, closeIdx) + helperBlock + src.slice(closeIdx);
    }

    // 4) Ensure onNewIntent override forwards to handler
    const onNewIntentBlock = `
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(intent)
    setIntent(intent)
    intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    handleInboundShareIntent(intent, source = "onNewIntent")
  }
`;
    if (!/override\s+fun\s+onNewIntent\(/.test(src)) {
      const closeIdx = src.lastIndexOf("\n}");
      src = src.slice(0, closeIdx) + onNewIntentBlock + src.slice(closeIdx);
    }

    // 5) Ensure cold-start handling inside onCreate after super.onCreate(...)
    if (!/handleInboundShareIntent\(intent,\s*source\s*=\s*"onCreate"\)/.test(src)) {
      // Try to insert right after super.onCreate(...)
      const onCreateSuperRegex = /(override\s+fun\s+onCreate\([\s\S]*?\{)([\s\S]*?super\.onCreate\([^\)]*\)[^\n]*\n)/;
      if (onCreateSuperRegex.test(src)) {
        src = src.replace(
          onCreateSuperRegex,
          (match, start, superLine) =>
            `${start}${superLine}    handleInboundShareIntent(intent, source = "onCreate")\n`
        );
      } else {
        // Fallback: append a minimal onCreate that calls the handler
        const onCreateFallback = `
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    handleInboundShareIntent(intent, source = "onCreate")
  }
`;
        const closeIdx = src.lastIndexOf("\n}");
        src = src.slice(0, closeIdx) + onCreateFallback + src.slice(closeIdx);
      }
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

  // 8) Disable shrinking in debug builds
  config = withDebugNoMinify(config);

  // 9) Inject ProGuard keep rules for release builds
  config = withProguardKeeps(config);
  config = wireProguardInBuildGradle(config);

  // 10) Write Canary Activity
  config = withCanaryActivitySource(config);

  return config;

};

