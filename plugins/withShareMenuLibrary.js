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
        "android:theme": "@android:style/Theme.NoDisplay",
        "android:taskAffinity": "",
        "android:excludeFromRecents": "true",
        "android:launchMode": "singleTask",
        "android:grantUriPermissions": "true",
        "android:resizeableActivity": "true",
      },
      "intent-filter": [
        // Text: cover common variants from Messages/links
        {
          action: [{ $: { "android:name": "android.intent.action.SEND" } }],
          category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
          data: [
            { $: { "android:mimeType": "text/plain" } },
            { $: { "android:mimeType": "text/*" } },
            { $: { "android:mimeType": "text/html" } },
            { $: { "android:mimeType": "text/uri-list" } },
          ],
        },
        // Single images: include specific subtypes some galleries use
        {
          action: [{ $: { "android:name": "android.intent.action.SEND" } }],
          category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
          data: [
            { $: { "android:mimeType": "image/*" } },
            { $: { "android:mimeType": "image/jpeg" } },
            { $: { "android:mimeType": "image/png" } },
            { $: { "android:mimeType": "image/webp" } },
          ],
        },
        // Multiple images
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


function withMainActivityLogging(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;

    // 1) Ensure imports (right after package line)
    if (!src.includes("import android.content.Intent")) {
      src = src.replace(
        /(package[^\n]*\n)/,
        `$1import android.content.Intent
import android.net.Uri
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactContext
import com.facebook.react.ReactInstanceEventListener
`
      );
    }

    // 2) Inject a retained pending intent field (only once)
    if (!src.includes("private var pendingShareIntent")) {
      // Find the first opening brace of the class and insert the field immediately after
      src = src.replace(
        /(class\s+MainActivity[^{]*\{)/,
        `$1\n    private var pendingShareIntent: Intent? = null\n`
      );
    }


    // 3) Patch onCreate (only once)
    if (!src.includes(">>> MainActivity onCreate")) {
      src = src.replace(
        /override fun onCreate\(savedInstanceState: Bundle\?\) \{/,
        `override fun onCreate(savedInstanceState: Bundle?) {
        android.widget.Toast.makeText(this, "MainActivity started", android.widget.Toast.LENGTH_SHORT).show()
        android.util.Log.e("BashChatTest", ">>> MainActivity onCreate fired with intent: " + getIntent())
        val intent = getIntent()
        if (intent != null && intent.action != Intent.ACTION_MAIN) {
          emitShareIntentToJS(intent)
        }`
      );
    }

    // 4) Inject onResume safety flush (only once)
    if (!src.includes("onResume flush: forwarding pending share")) {
      src = src.replace(
        /(}\s*)$/, // before final class brace
        `
  override fun onResume() {
    super.onResume()
    val manager = (application as ReactApplication).reactNativeHost.reactInstanceManager
    android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
      val context = manager.currentReactContext
      if (context != null && pendingShareIntent != null) {
        android.util.Log.e("BashChatTest", ">>> onResume delayed flush: forwarding pending share")
        forwardIntentToJS(context, pendingShareIntent!!)
        pendingShareIntent = null
      } else {
        android.util.Log.e("BashChatTest", ">>> onResume delayed flush: nothing to forward")
      }
    }, 500)
  }
$1`
      );
    }

    // 5) Inject onNewIntent + helper together, BEFORE the final class brace
    const needsOnNewIntent = !src.includes("override fun onNewIntent");
    const needsHelper = !src.includes("emitShareIntentToJS");
    if (needsOnNewIntent || needsHelper) {
      src = src.replace(
        /(}\s*)$/, // final closing brace of the class
        `
        override fun onNewIntent(intent: Intent) {
          super.onNewIntent(intent)
          setIntent(intent)
          android.widget.Toast.makeText(this, "MainActivity received: $intent", android.widget.Toast.LENGTH_SHORT).show()
          android.util.Log.e("BashChatTest", ">>> MainActivity onNewIntent fired with intent: $intent")
          if (intent != null && intent.action == Intent.ACTION_MAIN) {
            android.util.Log.e("BashChatTest", ">>> Ignoring immediate ACTION_MAIN relaunch to preserve share intent")
            return
          }
          emitShareIntentToJS(intent)
        }

        private fun emitShareIntentToJS(intent: Intent?) {
          if (intent == null) return

          val manager = (application as ReactApplication)
            .reactNativeHost
            .reactInstanceManager
          val context = manager.currentReactContext

          if (context == null) {
            android.util.Log.e("BashChatTest", ">>> ReactContext not ready, queuing share")
            // retain intent so we can flush in onResume or when ReactContext initializes
            pendingShareIntent = intent

            manager.addReactInstanceEventListener(object : ReactInstanceEventListener {
              override fun onReactContextInitialized(readyContext: ReactContext) {
                android.util.Log.e("BashChatTest", ">>> ReactContext became ready, scheduling share flush")

                // Post a short delay so JS has time to mount InboundShareBridge
                android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
                  val toForward = pendingShareIntent ?: intent
                  if (toForward != null) {
                    android.util.Log.e("BashChatTest", ">>> Delayed flush: forwarding pending share (listener)")
                    forwardIntentToJS(readyContext, toForward)
                    pendingShareIntent = null
                  }
                }, 1000) // 1 second delay

                manager.removeReactInstanceEventListener(this)
              }
            })
            
            // Independent delayed check — forwards even if listener timing was missed
            android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
              val ready = manager.currentReactContext
              if (ready != null && pendingShareIntent != null) {
                android.util.Log.e("BashChatTest", ">>> Delayed flush: forwarding pending share (independent)")
                forwardIntentToJS(ready, pendingShareIntent!!)
                pendingShareIntent = null
              } else {
                android.util.Log.e("BashChatTest", ">>> Delayed flush: context still null or no pending intent")
              }
            }, 1500)

            if (!manager.hasStartedCreatingInitialContext()) {
              manager.createReactContextInBackground()
            }
            return
          }

          forwardIntentToJS(context, intent)
        }

        private fun forwardIntentToJS(context: ReactContext, intent: Intent) {
          val action = intent.action
          val type = intent.type ?: ""

          if (Intent.ACTION_SEND != action) {
            android.util.Log.e("BashChatTest", ">>> Non-SEND action received: $action")
            return
          }

          when {
            type.startsWith("text/") -> {
              val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
              if (!sharedText.isNullOrEmpty()) {
                android.util.Log.e("BashChatTest", ">>> onShareReceived TEXT: $sharedText")
                context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                  .emit("onShareReceived", sharedText)
                return
              }
              val clip = intent.clipData
              val clipText = if (clip != null && clip.itemCount > 0) clip.getItemAt(0).text else null
              if (!clipText.isNullOrEmpty()) {
                android.util.Log.e("BashChatTest", ">>> onShareReceived TEXT (ClipData): $clipText")
                context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                  .emit("onShareReceived", clipText.toString())
                return
              }
              android.util.Log.e("BashChatTest", ">>> No text found in EXTRA_TEXT or ClipData")
            }

            type.startsWith("image/") -> {
              val imageUri: android.net.Uri? = intent.getParcelableExtra(Intent.EXTRA_STREAM)
              if (imageUri != null) {
                android.util.Log.e("BashChatTest", ">>> onShareReceived IMAGE: $imageUri")
                context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                  .emit("onShareReceived", imageUri.toString())
                return
              }
              val clip = intent.clipData
              val uriFromClip = if (clip != null && clip.itemCount > 0) clip.getItemAt(0).uri else null
              if (uriFromClip != null) {
                android.util.Log.e("BashChatTest", ">>> onShareReceived IMAGE (ClipData): $uriFromClip")
                context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                  .emit("onShareReceived", uriFromClip.toString())
                return
              }
              android.util.Log.e("BashChatTest", ">>> No image URI in EXTRA_STREAM or ClipData")
            }

            else -> {
              val clip = intent.clipData
              val item = if (clip != null && clip.itemCount > 0) clip.getItemAt(0) else null
              val anyText = item?.text
              val anyUri = item?.uri
              if (!anyText.isNullOrEmpty()) {
                android.util.Log.e("BashChatTest", ">>> onShareReceived FALLBACK TEXT: $anyText")
                context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                  .emit("onShareReceived", anyText.toString())
                return
              }
              if (anyUri != null) {
                android.util.Log.e("BashChatTest", ">>> onShareReceived FALLBACK URI: $anyUri")
                context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                  .emit("onShareReceived", anyUri.toString())
                return
              }
              android.util.Log.e("BashChatTest", ">>> Unhandled SEND type=$type")
            }
          }
        }
$1`
      );
    }

    cfg.modResults.contents = src;
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
            // Top-level crash capture
            Thread.setDefaultUncaughtExceptionHandler((t, e) -> {
              Log.e("BashChatTest", "!!! Uncaught in ShareMenuActivity: " + e.getMessage(), e);
            });

            android.widget.Toast.makeText(this, "BashChat Share started", android.widget.Toast.LENGTH_SHORT).show();
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

          Log.e("BashChatTest", ">>> Incoming action=" + incoming.getAction() + ", type=" + incoming.getType());

          if (Intent.ACTION_MAIN.equals(incoming.getAction())) {
            Log.e("BashChatTest", ">>> Ignoring ACTION_MAIN relaunch to preserve share intent");
            return;
          }

          Intent forward = new Intent(this, MainActivity.class);
          forward.setAction(incoming.getAction());
          forward.setType(incoming.getType());

          try {
            forward.putExtras(incoming);
          } catch (Exception e) {
            Log.e("BashChatTest", "!!! Failed to putExtras: " + e.getMessage(), e);
          }

          // Defensive mirroring of common extras
          String text = incoming.getStringExtra(Intent.EXTRA_TEXT);
          if (text != null) {
            forward.putExtra(Intent.EXTRA_TEXT, text);
            Log.e("BashChatTest", ">>> Mirrored EXTRA_TEXT: " + text);
          }

          Uri stream = incoming.getParcelableExtra(Intent.EXTRA_STREAM);
          if (stream != null) {
            forward.putExtra(Intent.EXTRA_STREAM, stream);
            Log.e("BashChatTest", ">>> Mirrored EXTRA_STREAM: " + stream);
          }

          ClipData clip = incoming.getClipData();
          if (clip != null) {
            forward.setClipData(clip);
            Log.e("BashChatTest", ">>> ClipData count: " + clip.getItemCount());
          }

          forward.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK 
               | Intent.FLAG_ACTIVITY_CLEAR_TOP 
               | Intent.FLAG_ACTIVITY_SINGLE_TOP);
          forward.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

          Uri data = incoming.getData();
          if (data != null) {
            forward.setData(data);
            Log.e("BashChatTest", ">>> Set data URI: " + data);
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
