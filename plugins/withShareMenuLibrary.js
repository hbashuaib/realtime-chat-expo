// plugins/withShareMenuLibrary.js
console.log("withShareMenuLibrary.js loaded");

const {
  withAndroidManifest,
  withMainActivity,
  withDangerousMod,
  withMainApplication,
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
        ].includes(a.$?.["android:name"]),
    );

    // Remove library activity duplicates before reinjecting (normalization).
    app.activity = (app.activity || []).filter(
      (a) => a.$?.["android:name"] !== "com.meedan.sharemenu.ShareMenuActivity",
    );

    // Inject ONLY the library's ShareMenuActivity
    app.activity.push({
      $: {
        "android:name": "com.anonymous.realtimechatexpo.ShareMenuActivity",
        "android:exported": "true",
        "android:enabled": "true",
        "android:label": SHARE_LABEL,
        "android:icon": "@mipmap/ic_launcher",
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
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
          ],
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
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
          ],
          data: [
            { $: { "android:mimeType": "image/*" } },
            { $: { "android:mimeType": "image/jpeg" } },
            { $: { "android:mimeType": "image/png" } },
            { $: { "android:mimeType": "image/webp" } },
          ],
        },
        // Multiple images
        {
          action: [
            { $: { "android:name": "android.intent.action.SEND_MULTIPLE" } },
          ],
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
          ],
          data: [{ $: { "android:mimeType": "image/*" } }],
        },
        // Audio (voice/music)
        {
          action: [{ $: { "android:name": "android.intent.action.SEND" } }],
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
          ],
          data: [{ $: { "android:mimeType": "audio/*" } }],
        },

        // Video
        {
          action: [{ $: { "android:name": "android.intent.action.SEND" } }],
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
          ],
          data: [{ $: { "android:mimeType": "video/*" } }],
        },

        // PDF documents
        {
          action: [{ $: { "android:name": "android.intent.action.SEND" } }],
          category: [
            { $: { "android:name": "android.intent.category.DEFAULT" } },
          ],
          data: [{ $: { "android:mimeType": "application/pdf" } }],
        },
      ],
    });

    return cfg;
  });
}

// Ensure app icon points to a guaranteed resource and avoid roundIcon issues.
function withNormalizeAppIcon(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app && app.$) {
      // Ensure application icon points to a guaranteed resource
      app.$["android:icon"] = "@mipmap/ic_launcher";

      // Remove or normalize round icon to avoid missing resource failures
      // Option 1: remove the attribute entirely
      delete app.$["android:roundIcon"];

      // Option 2 (alternative): set roundIcon to the same launcher icon
      // app.$["android:roundIcon"] = "@mipmap/ic_launcher";
    }
    return cfg;
  });
}

function withScrubMissingRoundIcon(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app?.$) {
      const round = app.$["android:roundIcon"];
      if (round && round.includes("ic_launcher_round")) {
        delete app.$["android:roundIcon"];
      }
    }
    // Also scrub any activity icons referencing ic_launcher_round (rare)
    const activities = cfg.modResults.manifest.application?.[0]?.activity || [];
    activities.forEach((act) => {
      if (act.$?.["android:icon"]?.includes("ic_launcher_round")) {
        act.$["android:icon"] = "@mipmap/ic_launcher";
      }
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

      const filters = Array.isArray(act["intent-filter"])
        ? act["intent-filter"]
        : [];

      // Strip any SEND/SEND_MULTIPLE filters defensively
      // Also strip any existing VIEW filters to avoid duplicates
      const withoutSendOrView = filters.filter((f) => {
        const actions = (f.action || []).map((a) => a.$?.["android:name"]);
        return (
          !actions.includes("android.intent.action.SEND") &&
          !actions.includes("android.intent.action.SEND_MULTIPLE") &&
          !actions.includes("android.intent.action.SENDTO") && // ✅ new
          !actions.includes("android.intent.action.VIEW")
        );
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

// Patch MainActivity.kt to handle share intents robustly with logging
function withMainActivityLogging(config) {
  return withMainActivity(config, (cfg) => {
    let src = cfg.modResults.contents;

    // 1) Ensure imports (right after package line) — add missing imports cleanly, no leading spaces
    if (!src.includes("import android.content.Intent")) {
      src = src.replace(
        /(package[^\n]*\n)/,
        `$1import android.content.Intent
import android.net.Uri
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactContext
import com.facebook.react.ReactInstanceEventListener
import com.anonymous.realtimechatexpo.R
import com.anonymous.realtimechatexpo.BuildConfig
import com.anonymous.realtimechatexpo.BashShareQueue

`,
      );
    }

    // Ensure Bundle is present only once
    if (!src.includes("import android.os.Bundle")) {
      src = src.replace(
        /(package[^\n]*\n)/,
        `$1import android.os.Bundle
`,
      );
    }

    // 2) Inject retained intent fields (instance + static backup)
    if (!src.includes("private var pendingShareIntent")) {
      src = src.replace(
        /(class\s+MainActivity[^{]*\{)/,
        `$1
  private var pendingShareIntent: Intent? = null
  companion object {
    var pendingShareStatic: Intent? = null
  }
  private var shareInitListenerAdded: Boolean = false
`,
      );
    }

    // 3) Patch onCreate (preserve setTheme + super.onCreate(null))
    if (!src.includes(">>> MainActivity onCreate")) {
      src = src.replace(
        /override fun onCreate\(savedInstanceState: Bundle\?\) \{([\s\S]*?)\n\s*super\.onCreate\(null\)\n\s*\}/,
        String.raw`override fun onCreate(savedInstanceState: Bundle?) {$1
  // >>> MainActivity onCreate injected
  android.widget.Toast.makeText(this, "MainActivity started", android.widget.Toast.LENGTH_SHORT).show()
  android.util.Log.e("BashChatTest", ">>> MainActivity onCreate fired with intent: " + getIntent())

  val manager = (application as ReactApplication).reactNativeHost.reactInstanceManager

  // Always add a listener once per app start
  manager.addReactInstanceEventListener(object : ReactInstanceEventListener {
      override fun onReactContextInitialized(readyContext: ReactContext) {
        android.util.Log.e("BashChatTest", ">>> ReactContext ready; flushing pending share")
        val module = readyContext.getNativeModule(BashShareModule::class.java)
        module?.flushPendingShareInternal()
        manager.removeReactInstanceEventListener(this)
      }
  }) 

  // ✅ Handle cold start share intent  
  val intent = getIntent()
  if (intent != null && intent.action == Intent.ACTION_SEND) {
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      if (!sharedText.isNullOrEmpty()) {
          val cleaned = sharedText.trim().trim('"').trim('“').trim('”').trim('\'')
          val json = """{"kind":"text","payload":{"text":${"$"}{escapeJson(cleaned)}}}"""
          BashShareQueue.setPending(json)
          android.util.Log.e("BashChatTest", ">>> Queued JSON into BashShareQueue (onCreate): $json")          
      }
  }   
 
  super.onCreate(null)
}`,
      );
    }

    // 4) Remove any duplicate onResume overrides (defensive cleanup)    
    src = src.replace(
      /override fun onResume\(\)[\s\S]*?super\.onResume\(\)[\s\S]*?Log\.e\([^)]+\)[\s\S]*?}/gm,
      "",
    ); 
    
    // ❌ Do not inject anything new for onResume
    // ✅ Leave MainActivity without an onResume override

    // 5) Inject onNewIntent + helpers before final class brace — end with single class brace
    const needsOnNewIntent = !src.includes("override fun onNewIntent(");
    const needsHelperEmit = !src.includes("private fun emitShareIntentToJS(");
    const needsHelperForward = !src.includes("private fun forwardIntentToJS(");

    if (needsOnNewIntent || needsHelperEmit || needsHelperForward) {
      src = src.replace(
        /}\s*$/,
        String.raw`
  override fun onNewIntent(intent: Intent) {
      super.onNewIntent(intent)
      setIntent(intent)      
      android.util.Log.e("BashChatTest", ">>> MainActivity onNewIntent fired with intent: $intent")

      val manager = (application as ReactApplication).reactNativeHost.reactInstanceManager  // ✅ add this
      
      if (intent != null && intent.action == Intent.ACTION_MAIN) {
          android.util.Log.e("BashChatTest", ">>> Ignoring ACTION_MAIN relaunch to preserve share intent")
          return
      }

      // Queue payload
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      if (!sharedText.isNullOrEmpty()) {
          val cleaned = sharedText.trim().trim('"').trim('“').trim('”').trim('\'')
          val json = """{"kind":"text","payload":{"text":${"$"}{escapeJson(cleaned)}}}"""
          BashShareQueue.setPending(json)
          android.util.Log.e("BashChatTest", ">>> Queued JSON into BashShareQueue (onNewIntent): $json")
      }

      // Flush if JS is alive
      val context = manager.currentReactContext
      if (context != null && context.hasActiveCatalystInstance()) {
          val module = context.getNativeModule(BashShareModule::class.java)
          module?.flushPendingShareInternal()
          android.util.Log.e("BashChatTest", ">>> Flushed pending share immediately onNewIntent")
      } else {
          android.util.Log.e("BashChatTest", ">>> ReactContext not ready, payload stays queued")
      }

      // ✅ Only queue the intent
      // pendingShareIntent = intent
      // pendingShareStatic = intent

      // Build and enqueue JSON immediately
      // val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      // if (!sharedText.isNullOrEmpty()) {
      //     val cleaned = sharedText.trim().trim('"').trim('“').trim('”').trim('\'')
      //     val json = """{"kind":"text","payload":{"text":${"$"}{escapeJson(cleaned)}}}"""
      //     BashShareQueue.setPending(json)
      //     android.util.Log.e("BashChatTest", ">>> Queued JSON into BashShareQueue (onNewIntent): $json")
      // } 
      
  }  
  
  private fun forwardIntentToJS(context: ReactContext, intent: Intent) {
      val action = intent.action
      val type = intent.type ?: ""
      android.util.Log.e("BashChatTest", ">>> forwardIntentToJS: action=$action type=$type")

      fun normalizeText(raw: String): String {
          return raw.trim().trim('"').trim('“').trim('”').trim('\'')
      }

      fun emitJson(json: String) {
          try {
            // 🔎 Log queue state before enqueue
            val beforePeek = BashShareQueue.peek()
            android.util.Log.e("BashChatTest", ">>> forwardIntentToJS peek before enqueue: $beforePeek")

            BashShareQueue.setPending(json)
            android.util.Log.e("BashChatTest", ">>> Queued JSON into BashShareQueue: $json")

            // 🔎 Log queue state after enqueue
            val afterPeek = BashShareQueue.peek()
            android.util.Log.e("BashChatTest", ">>> forwardIntentToJS peek after enqueue: $afterPeek")
        } catch (e: Exception) {
            android.util.Log.e("BashChatTest", "!!! Failed to queue JSON: ${"${"}e.message${"}"}", e)
        }
          pendingShareIntent = intent
          pendingShareStatic = intent
      }

      // --- Text via EXTRA_TEXT ---
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      if (!sharedText.isNullOrEmpty()) {
          val cleaned = normalizeText(sharedText)
          val json = """{"kind":"text","payload":{"text":${"$"}{escapeJson(cleaned)}}}"""
          emitJson(json)
          return
      }

      // --- Streams (image/audio/video/pdf) ---
      val streamUri: android.net.Uri? = intent.getParcelableExtra(Intent.EXTRA_STREAM)
          ?: intent.clipData?.let { if (it.itemCount > 0) it.getItemAt(0).uri else null }

      if (streamUri != null) {
          val resolver = applicationContext.contentResolver
          val mime = resolver.getType(streamUri) ?: type
          val base64 = readUriToBase64(resolver, streamUri)
          val filename = guessFilename(resolver, streamUri)

          val json = when {
              mime.startsWith("image/") ->
                  """{"kind":"image","payload":{"base64":"$base64","filename":${"$"}{escapeJson(filename)}}}"""
              mime.startsWith("video/") ->
                  """{"kind":"video","payload":{"video":"$base64","video_filename":${"$"}{escapeJson(filename)}}}"""
              mime.startsWith("audio/") ->
                  """{"kind":"voice","payload":{"base64":"$base64","filename":${"$"}{escapeJson(filename)}}}"""
              mime == "application/pdf" ->
                  """{"kind":"document","payload":{"base64":"$base64","filename":${"$"}{escapeJson(filename)}}}"""
              else ->
                  """{"kind":"uri","uri":${"$"}{escapeJson(streamUri.toString())},"mime":${"$"}{escapeJson(mime)}}"""
          }

          emitJson(json)
          return
      }

      // --- Fallbacks ---
      val clip = intent.clipData
      val item = if (clip != null && clip.itemCount > 0) clip.getItemAt(0) else null
      val anyText = item?.text
      val anyUri = item?.uri

      if (!anyText.isNullOrEmpty()) {
          val cleaned = normalizeText(stripUrls(anyText.toString()))
          val json = """{"kind":"text","payload":{"text":${"$"}{escapeJson(cleaned)}}}"""
          emitJson(json)
          return
      }

      if (anyUri != null) {
          val mime = applicationContext.contentResolver.getType(anyUri) ?: type
          val json = """{"kind":"uri","uri":${"$"}{escapeJson(anyUri.toString())},"mime":${"$"}{escapeJson(mime)}}"""
          emitJson(json)
          return
      }
  }

  // Helper to escape JSON strings
  private fun escapeJson(raw: String): String {
    val s = raw.replace("\\", "\\\\")
               .replace("\"", "\\\"")
               .replace("\n", "\\n")
               .replace("\r", "\\r")
    return "\"$s\""
  }

  // Helper to read URI content as Base64
  private fun readUriToBase64(resolver: android.content.ContentResolver, uri: android.net.Uri): String? {
    return try {
      resolver.openInputStream(uri)?.use { input ->
        val bytes = input.readBytes()
        android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
      }
    } catch (e: Exception) {
      android.util.Log.e("BashChatTest", "readUriToBase64 failed: ${"${"}e.message${"}"}", e)
      null
    }
  }

  // Helper to guess filename from URI
  private fun guessFilename(resolver: android.content.ContentResolver, uri: android.net.Uri): String {
    try {
      resolver.query(uri, arrayOf(android.provider.OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
        if (c.moveToFirst()) {
          val idx = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
          if (idx >= 0) {
            val name = c.getString(idx)
            if (!name.isNullOrBlank()) return name
          }
        }
      }
    } catch (_: Exception) {}
    val last = uri.lastPathSegment ?: ""
    if (last.isNotBlank()) return last
    val mime = resolver.getType(uri) ?: ""
    return when {
      mime.startsWith("image/") -> "share_${"${"}System.currentTimeMillis()${"}"}.jpg"
      mime.startsWith("video/") -> "share_${"${"}System.currentTimeMillis()${"}"}.mp4"
      mime.startsWith("audio/") -> "share_${"${"}System.currentTimeMillis()${"}"}.m4a"
      mime == "application/pdf" -> "share_${"${"}System.currentTimeMillis()${"}"}.pdf"
      else -> "share_${"${"}System.currentTimeMillis()${"}"}.bin"
    }
  }

  // Helper to strip URLs from shared text
  private fun stripUrls(text: String): String {
    val urlRegex = Regex("\\bhttps?://\\S+", RegexOption.IGNORE_CASE)
    return text.replace(urlRegex, "")
               .replace("\n", " ")
               .replace(Regex("\\s{2,}"), " ")
               .trim()
  }
}
`,
      );
    }

    cfg.modResults.contents = src;

    // ✅ Strip manual clears from delayed flushes
    const mainActivityPath = path.join(
      cfg.modRequest.projectRoot,
      "android",
      "app",
      "src",
      "main",
      "java",
      "com",
      "anonymous",
      "realtimechatexpo",
      "MainActivity.kt",
    );
    if (fs.existsSync(mainActivityPath)) {
      let ma = fs.readFileSync(mainActivityPath, "utf8");
      ma = ma.replace(
        /forwardIntentToJS\(readyContext,\s*toForward\)\s*\n\s*pendingShareIntent\s*=\s*null/g,
        "forwardIntentToJS(readyContext, toForward)\n// emitJson clears after success",
      );

      ma = ma.replace(
        /forwardIntentToJS\(readyContext,\s*toForward2\)\s*\n\s*pendingShareStatic\s*=\s*null/g,
        "forwardIntentToJS(readyContext, toForward2)\n// emitJson clears after success",
      );

      fs.writeFileSync(mainActivityPath, ma);
      console.log(
        "Stripped manual clears from MainActivity delayed flushes",
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
        "realtimechatexpo",
      );
      const filePath = path.join(srcDir, "ShareMenuActivity.java");

      const javaCode = `package com.anonymous.realtimechatexpo;

      import android.content.Intent;
      import android.os.Bundle;
      import androidx.appcompat.app.AppCompatActivity;
      import android.net.Uri;
      import android.content.ClipData;
      import android.util.Log;
      import com.facebook.react.ReactApplication;
      

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

            try {
                String text = incoming.getStringExtra(Intent.EXTRA_TEXT);
                Uri stream = incoming.getParcelableExtra(Intent.EXTRA_STREAM);
                String mime = incoming.getType();

                if (text != null) {
                    String json = "{\\\"kind\\\":\\\"text\\\",\\\"payload\\\":{\\\"text\\\":\" + escapeJson(text) + "}}";
                    BashShareQueue.setPending(json);
                    Log.e("BashChatTest", ">>> Queued text payload: " + text);
                } else if (stream != null) {
                    String json = "{\\\"kind\\\":\\\"image\\\",\\\"payload\\\":{\\\"uri\\\":\" + escapeJson(stream.toString()) + ",\\\"mime\\\":\" + escapeJson(mime) + "}}";
                    BashShareQueue.setPending(json);
                    Log.e("BashChatTest", ">>> Queued image payload: " + stream);
                }                
            } catch (Exception e) {
                Log.e("BashChatTest", "!!! Failed to queue payload: " + e.getMessage(), e);
            }            

            Intent forward = new Intent(this, MainActivity.class);
            forward.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            forward.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            try {
                startActivity(forward);
                Log.e("BashChatTest", ">>> Forwarded intent to MainActivity successfully");
            } catch (Exception e) {
                Log.e("BashChatTest", "!!! Exception while starting MainActivity: " + e.getMessage(), e);
            }

            finish();
        }

        // Utility method to safely escape strings for JSON
        private static String escapeJson(String input) {
            if (input == null) {
                return "\\\"\\\""; // return empty JSON string
            }
            String escaped = input
                .replace("\\\\", "\\\\\\\\")   // escape backslashes
                .replace("\\\"", "\\\\\\\"")   // escape quotes
                .replace("\\n", "\\\\n")       // escape newlines
                .replace("\\r", "\\\\r")       // escape carriage returns
                .replace("\\t", "\\\\t");      // escape tabs
            return "\\\"" + escaped + "\\\"";  // wrap in quotes for valid JSON
        }
      }
      `;

      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(filePath, javaCode);
      return cfg;
    },
  ]);
}

// Create RealtimeChatExpoApplication.kt to subclass MainApplication and init BashShareQueue
function withRealtimeChatExpoApplicationKotlin(config) {
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
        "realtimechatexpo",
      );
      const filePath = path.join(srcDir, "RealtimeChatExpoApplication.kt");

      const kotlinCode = `package com.anonymous.realtimechatexpo

import android.app.Application
import com.anonymous.realtimechatexpo.BashShareQueue

class RealtimeChatExpoApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        BashShareQueue.init(this)
        android.util.Log.e("BashChatTest", ">>> RealtimeChatExpoApplication started")
    }
}

`;

      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(filePath, kotlinCode);
      return cfg;
    },
  ]);
}

// Ensure BashSharePackage is included in MainApplication.java
function withBashSharePackage(config) {
  return withMainApplication(config, (cfg) => {
    let src = cfg.modResults.contents;

    // 1. Ensure imports
    if (!src.includes("import com.anonymous.realtimechatexpo.BashSharePackage")) {
      src = src.replace(
        /(package[^\n]*\n)/,
        `$1import com.anonymous.realtimechatexpo.BashSharePackage\nimport com.anonymous.realtimechatexpo.BashShareQueue\n`
      );
    }

    // 2. Ensure companion object
    if (!src.includes("companion object")) {
      src = src.replace(
        /(class\s+MainApplication[^{]*\{)/,
        `$1\n  companion object {\n    lateinit var instance: MainApplication\n      private set\n  }\n`
      );
    }

    // 3. Ensure instance assignment + BashShareQueue.init in onCreate
    if (!src.includes("BashShareQueue.init(this)")) {
      src = src.replace(
        /super\.onCreate\(\)/,
        `super.onCreate()\n    instance = this\n    BashShareQueue.init(this)\n    android.util.Log.e("BashChatTest", ">>> BashShareQueue initialized in MainApplication")`
      );
    }

    // 4. Ensure package is added
    if (!src.includes("add(BashSharePackage())")) {
      src = src.replace(
        /(PackageList\(this\)\.packages\.apply \{)/,
        `$1\n    add(BashSharePackage())`
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });
}


// Optional: ensure no custom inbound handlers collide (we keep MainActivity untouched)
function withNoOpMainActivity(config) {
  return withMainActivity(config, (cfg) => cfg);
}

// Export the combined plugin
module.exports = function withShareMenuLibrary(config) {
  // Inject activities and filters first
  config = withInjectLibraryShareActivity(config);
  config = withNormalizeMainActivityViewFilters(config);
  config = withNoOpMainActivity(config);
  config = withMainActivityLogging(config); 
  config = withShareMenuActivityJava(config);

  // Normalize icons
  config = withNormalizeAppIcon(config);
  config = withScrubMissingRoundIcon(config);    

  // Generate our custom Application class
  config = withRealtimeChatExpoApplicationKotlin(config);

  // Ensure BashSharePackage is wired into MainApplication.java
  config = withBashSharePackage(config); 
  
  return config;
};
