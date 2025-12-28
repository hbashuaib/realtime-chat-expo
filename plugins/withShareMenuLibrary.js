// plugins/withShareMenuLibrary.js
console.log("withShareMenuLibrary.js loaded");

const {
  withAndroidManifest,
  withMainActivity,  
  withDangerousMod,
} = require("@expo/config-plugins");

const fs = require("fs");
const path = require("path");


// Unique labels/icons help you distinguish entries if any duplicate sneaks in.
// You can adjust these to your asset names; they’ll be harmless if missing.
const SHARE_LABEL = "BashChat Share";
const SHARE_ICON = "@mipmap/ic_share_bashchat";

// Inject only the library's ShareMenuActivity into the manifest.
function withInjectLibraryShareActivity(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const app = manifest.application?.[0];
    if (!app) return cfg;

    // Remove any custom Share activities from previous setups (defensive).
    app.activity = (app.activity || []).filter(
      (a) =>
        ![
          "com.anonymous.realtimechatexpo.ShareMenuActivity",
          ".ShareMenuActivity",
          "com.anonymous.realtimechatexpo.ShareMenuActivityCanary",
          ".ShareMenuActivityCanary",
        ].includes(a.$?.["android:name"])
    );

    // Remove library activity duplicates before reinjecting (normalization).
    app.activity = (app.activity || []).filter(
      (a) => a.$?.["android:name"] !== "com.meedan.sharemenu.ShareMenuActivity"
    );

    // Inject ONLY the library's ShareMenuActivity
    app.activity.push({
      $: {
        "android:name": "com.anonymous.realtimechatexpo.ShareMenuActivity",
        "android:exported": "true",
        "android:enabled": "true",
        "android:label": SHARE_LABEL,
        //"android:icon": SHARE_ICON,
        "android:theme": "@android:style/Theme.Translucent.NoTitleBar",
      },
      "intent-filter": [
        // Text share
        {
          action: [{ $: { "android:name": "android.intent.action.SEND" } }],
          category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
          data: [{ $: { "android:mimeType": "text/plain" } }],
        },
        // Single image share (keep simple, library handles specifics)
        {
          action: [{ $: { "android:name": "android.intent.action.SEND" } }],
          category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
          data: [{ $: { "android:mimeType": "image/*" } }],
        },
        // Multiple images share
        {
          action: [{ $: { "android:name": "android.intent.action.SEND_MULTIPLE" } }],
          category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
          data: [{ $: { "android:mimeType": "image/*" } }],
        },
      ],
    });

    return cfg;
  });
}

// Keep your MainActivity deep-link VIEW filter canonical and ensure no SEND filters leak in.
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

      // Strip any SEND/SEND_MULTIPLE filters defensively
      // Also strip any existing VIEW filters to avoid duplicates
      const withoutSendOrView = filters.filter((f) => {
        const actions = (f.action || []).map((a) => a.$?.["android:name"]);
        return !actions.includes("android.intent.action.SEND") &&
              !actions.includes("android.intent.action.SEND_MULTIPLE") &&
              !actions.includes("android.intent.action.VIEW");
      });

      // Inject a single canonical VIEW filter with both schemes
      const canonicalView = {
        action: [{ $: { "android:name": "android.intent.action.VIEW" } }],
        category: [
          { $: { "android:name": "android.intent.category.DEFAULT" } },
          { $: { "android:name": "android.intent.category.BROWSABLE" } },
        ],
        data: [
          { $: { "android:scheme": "realtimechatexpo" } },
          { $: { "android:scheme": "exp+realtime-chat-expo" } },
        ],
      };

      act["intent-filter"] = [...withoutSendOrView, canonicalView];

      // Defensive attributes
      act.$["android:launchMode"] = "singleTask";
      act.$["android:exported"] = act.$["android:exported"] ?? "true";

      return act;
    });

    return cfg;
  });
}

// Add logging to MainActivity for debugging inbound intents.
function withMainActivityLogging(config) {
  return withMainActivity(config, (cfg) => {
    const src = cfg.modResults.contents;

    // Defensive: only add once
    if (!src.includes("BashChatTest")) {
      cfg.modResults.contents = src.replace(
        /super\.onNewIntent\(intent\);/,
        `super.onNewIntent(intent);
        android.util.Log.e("BashChatTest", ">>> MainActivity onNewIntent fired with intent: " + intent);`
      );
    }

    return cfg;
  });
}

// Create ShareMenuActivity.java earlier so Gradle compiles it
function withShareMenuActivityJava(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const srcDir = path.join(
        cfg.modRequest.projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        "com",
        "anonymous",
        "realtimechatexpo"
      );
      const filePath = path.join(srcDir, "ShareMenuActivity.java");

      const javaCode = `package com.anonymous.realtimechatexpo;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import android.net.Uri;
import android.content.ClipData;
import android.util.Log;

public class ShareMenuActivity extends AppCompatActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    try {
      Log.e("BashChatTest", ">>> ShareMenuActivity onCreate fired with intent: " + getIntent());
      handleIncomingIntent(getIntent());
    } catch (Exception e) {
      Log.e("BashChatTest", "!!! Exception in onCreate: " + e.getMessage(), e);
    }
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    try {
      Log.e("BashChatTest", ">>> ShareMenuActivity onNewIntent fired with intent: " + intent);
      handleIncomingIntent(intent);
    } catch (Exception e) {
      Log.e("BashChatTest", "!!! Exception in onNewIntent: " + e.getMessage(), e);
    }
  }

  private void handleIncomingIntent(Intent incoming) {
    if (incoming == null) {
      Log.e("BashChatTest", "!!! Incoming intent is null");
      return;
    }

    Intent forward = new Intent(this, MainActivity.class);
    forward.setAction(incoming.getAction());
    forward.setType(incoming.getType());
    forward.putExtras(incoming);

    ClipData clip = incoming.getClipData();
    if (clip != null) {
      forward.setClipData(clip);
    }

    forward.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    forward.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

    Uri data = incoming.getData();
    if (data != null) {
      forward.setData(data);
    }

    try {
      startActivity(forward);
      Log.e("BashChatTest", ">>> Forwarded intent to MainActivity successfully");
    } catch (Exception e) {
      Log.e("BashChatTest", "!!! Exception while starting MainActivity: " + e.getMessage(), e);
    }

    finish();
  }
}
`;

      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(filePath, javaCode);
      return cfg;
    },
  ]);
}



// Optional: ensure no custom inbound handlers collide (we keep MainActivity untouched)
function withNoOpMainActivity(config) {
  return withMainActivity(config, (cfg) => cfg);
}

module.exports = function withShareMenuLibrary(config) {
  config = withInjectLibraryShareActivity(config);
  config = withNormalizeMainActivityViewFilters(config);
  config = withNoOpMainActivity(config);  
  config = withMainActivityLogging(config);
  config = withShareMenuActivityJava(config);
  return config;
};





// // Create ShareMenuActivity.java earlier so Gradle compiles it
// function withShareMenuActivityJava(config) {
//   return withAppBuildGradle(config, (cfg) => {
//     const srcDir = path.join(
//       cfg.modRequest.projectRoot,
//       "android",
//       "app",
//       "src",
//       "main",
//       "java",
//       "com",
//       "anonymous",
//       "realtimechatexpo"
//     );
//     const filePath = path.join(srcDir, "ShareMenuActivity.java");

//     const javaCode = `
// package com.anonymous.realtimechatexpo;

// import android.content.Intent;
// import android.os.Bundle;
// import androidx.appcompat.app.AppCompatActivity;
// import android.net.Uri;
// import android.content.ClipData;
// import android.util.Log;

// public class ShareMenuActivity extends AppCompatActivity {
//   @Override
//   protected void onCreate(Bundle savedInstanceState) {
//     super.onCreate(savedInstanceState);
//     try {
//       Log.e("BashChatTest", ">>> ShareMenuActivity onCreate fired with intent: " + getIntent());
//       handleIncomingIntent(getIntent());
//     } catch (Exception e) {
//       Log.e("BashChatTest", "!!! Exception in onCreate: " + e.getMessage(), e);
//     }
//   }

//   @Override
//   protected void onNewIntent(Intent intent) {
//     super.onNewIntent(intent);
//     try {
//       Log.e("BashChatTest", ">>> ShareMenuActivity onNewIntent fired with intent: " + intent);
//       handleIncomingIntent(intent);
//     } catch (Exception e) {
//       Log.e("BashChatTest", "!!! Exception in onNewIntent: " + e.getMessage(), e);
//     }
//   }

//   private void handleIncomingIntent(Intent incoming) {
//     if (incoming == null) {
//       Log.e("BashChatTest", "!!! Incoming intent is null");
//       return;
//     }

//     Intent forward = new Intent(this, MainActivity.class);
//     forward.setAction(incoming.getAction());
//     forward.setType(incoming.getType());
//     forward.putExtras(incoming);

//     ClipData clip = incoming.getClipData();
//     if (clip != null) {
//       forward.setClipData(clip);
//     }

//     forward.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
//     forward.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

//     Uri data = incoming.getData();
//     if (data != null) {
//       forward.setData(data);
//     }

//     try {
//       startActivity(forward);
//       Log.e("BashChatTest", ">>> Forwarded intent to MainActivity successfully");
//     } catch (Exception e) {
//       Log.e("BashChatTest", "!!! Exception while starting MainActivity: " + e.getMessage(), e);
//     }

//     finish();
//   }
// }
// `;

//     fs.mkdirSync(srcDir, { recursive: true });
//     fs.writeFileSync(filePath, javaCode);
//     return cfg;
//   });
// }
