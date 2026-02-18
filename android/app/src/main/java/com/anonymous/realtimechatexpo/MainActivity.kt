package com.anonymous.realtimechatexpo
import expo.modules.splashscreen.SplashScreenManager
import android.content.Intent
import android.net.Uri
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactContext
import com.facebook.react.ReactInstanceEventListener
import com.anonymous.realtimechatexpo.R
import com.anonymous.realtimechatexpo.BuildConfig


import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  private var pendingShareIntent: Intent? = null
  companion object {
    var pendingShareStatic: Intent? = null
  }
  private var shareInitListenerAdded: Boolean = false

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
  // >>> MainActivity onCreate injected
  android.widget.Toast.makeText(this, "MainActivity started", android.widget.Toast.LENGTH_SHORT).show()
  android.util.Log.e("BashChatTest", ">>> MainActivity onCreate fired with intent: " + getIntent())

  val manager = (application as ReactApplication).reactNativeHost.reactInstanceManager

  // Always add a listener once per app start
  manager.addReactInstanceEventListener(object : ReactInstanceEventListener {
    override fun onReactContextInitialized(readyContext: ReactContext) {
      android.util.Log.e("BashChatTest", ">>> ReactContext ready; flushing pending share")
      val immediate = pendingShareIntent ?: pendingShareStatic
      if (immediate != null) {
        forwardIntentToJS(readyContext, immediate)        
      }

      // Always flush BashShareQueue into JS
      val pendingJson = com.anonymous.realtimechatexpo.BashShareQueue.peek() as? String
      if (!pendingJson.isNullOrEmpty()) {
          val uiHandler = android.os.Handler(android.os.Looper.getMainLooper())
          uiHandler.postDelayed({
              val module = readyContext.getNativeModule(BashShareModule::class.java)
              if (readyContext.hasActiveCatalystInstance() && module != null) {
                  android.util.Log.e("BashChatTest", ">>> Flushing pending JSON: $pendingJson")
                  module.notifyShareReceived(pendingJson)
                  com.anonymous.realtimechatexpo.BashShareQueue.consume()
              } else {
                  android.util.Log.e("BashChatTest", "!!! ReactContext not active, re-queueing")
                  com.anonymous.realtimechatexpo.BashShareQueue.setPending(pendingJson)
              }
          }, 5000)
      }
      
      manager.removeReactInstanceEventListener(this)
    }
  })

  // Flush immediately if context is already active
  val existingContext = manager.currentReactContext
  if (existingContext != null) {
    android.util.Log.e("BashChatTest", ">>> ReactContext already active; flushing pending share")
    val immediate = pendingShareIntent ?: pendingShareStatic
    if (immediate != null) {
      forwardIntentToJS(existingContext, immediate)
    }
  }

  val intent = getIntent()
  if (intent != null && intent.action != Intent.ACTION_MAIN) {
    emitShareIntentToJS(intent)
  }
    // @generated begin expo-splashscreen - expo prebuild (DO NOT MODIFY) sync-f3ff59a738c56c9a6119210cb55f0b613eb8b6af
    SplashScreenManager.registerOnActivity(this)
    // @generated end expo-splashscreen
  super.onCreate(null)
}

  /**
   * Returns the name of the main component registered from JavaScript. This is used to schedule
   * rendering of the component.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Returns the instance of the [ReactActivityDelegate]. We use [DefaultReactActivityDelegate]
   * which allows you to enable New Architecture with a single boolean flags [fabricEnabled]
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
    * Align the back button behavior with Android S
    * where moving root activities to background instead of finishing activities.
    * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">onBackPressed</a>
    */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }

      override fun onResume() {
          super.onResume()
          android.util.Log.e("BashChatTest", ">>> onResume: checking for pending share")

          val manager = (application as ReactApplication).reactNativeHost.reactInstanceManager
          val context = manager.currentReactContext

          // Flush intent if present
          val immediate = pendingShareIntent ?: pendingShareStatic
          if (context != null && immediate != null) {
              android.util.Log.e("BashChatTest", ">>> Flushing pending share from onResume")
              forwardIntentToJS(context, immediate)
          }

          // Flush BashShareQueue
          val pendingJson = com.anonymous.realtimechatexpo.BashShareQueue.peek() as? String
          android.util.Log.e("BashChatTest", ">>> onResume: BashShareQueue.peek() = $pendingJson")

          if (!pendingJson.isNullOrEmpty()) {
              android.util.Log.e("BashChatTest", ">>> Holding BashShareQueue until JS consumes")
              // ❌ Do not emit or consume here
              // ✅ Leave it queued for JS to fetch via consumePendingShare()
          }
      }   // ✅ only one brace closes onResume
    
  override fun onNewIntent(intent: Intent) {
      super.onNewIntent(intent)
      setIntent(intent)
      android.widget.Toast.makeText(this, "MainActivity received: $intent", android.widget.Toast.LENGTH_SHORT).show()
      android.util.Log.e("BashChatTest", ">>> MainActivity onNewIntent fired with intent: $intent")

      if (intent != null && intent.action == Intent.ACTION_MAIN) {
          android.util.Log.e("BashChatTest", ">>> Ignoring immediate ACTION_MAIN relaunch to preserve share intent")
          return
      }

      // Do not flush here — just queue
      pendingShareIntent = intent
      pendingShareStatic = intent

      // Build and enqueue JSON immediately so it’s ready when ReactContext initializes
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      if (!sharedText.isNullOrEmpty()) {
          val cleaned = sharedText.trim().trim('"').trim('“').trim('”').trim('\'')
          val json = """{"kind":"text","text":${escapeJson(cleaned)}}"""
          com.anonymous.realtimechatexpo.BashShareQueue.setPending(json)
          android.util.Log.e("BashChatTest", ">>> Queued JSON into BashShareQueue (onNewIntent): $json")
      }

      // ReactContext will be created in background if not already
      val manager = (application as ReactApplication).reactNativeHost.reactInstanceManager
      if (manager.currentReactContext == null) {
          try {
              android.util.Log.e("BashChatTest", ">>> Forcing React context creation in background")
              manager.createReactContextInBackground()
          } catch (e: Exception) {
              android.util.Log.e("BashChatTest", "!!! Failed to create React context: ${e.message}", e)
          }
      }
  }

  private fun emitShareIntentToJS(intent: Intent?) {
    if (intent == null) return

    val manager = (application as ReactApplication).reactNativeHost.reactInstanceManager
    val context = manager.currentReactContext

    if (context == null) {
      android.util.Log.e("BashChatTest", ">>> ReactContext not ready, queuing NEW share (overwrite)")
      pendingShareIntent = intent
      pendingShareStatic = intent

      // Build and enqueue JSON even if context is null
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      if (!sharedText.isNullOrEmpty()) {
        val cleaned = sharedText.trim().trim('"').trim('“').trim('”').trim('\'')
        val json = """{"kind":"text","text":${escapeJson(cleaned)}}"""
        com.anonymous.realtimechatexpo.BashShareQueue.setPending(json)
        android.util.Log.e("BashChatTest", ">>> Queued JSON into BashShareQueue (context null): $json")
      }

      try {
        android.util.Log.e("BashChatTest", ">>> Forcing React context creation in background")
        manager.createReactContextInBackground()
      } catch (e: Exception) {
        android.util.Log.e("BashChatTest", "!!! Failed to create React context: ${e.message}", e)
      }

      return
    }

    // ❌ Remove immediate forwarding
    // ✅ Only queue intent; JS will consume later
    pendingShareIntent = intent
    pendingShareStatic = intent
  }

  private fun forwardIntentToJS(context: ReactContext, intent: Intent) {
    val action = intent.action
    val type = intent.type ?: ""
    android.util.Log.e("BashChatTest", ">>> forwardIntentToJS: action=$action type=$type")
        
    // Helper to escape JSON strings
    fun normalizeText(raw: String): String {
        // Trim whitespace and common quote characters to avoid "\"text\"" payloads
        return raw.trim().trim('"').trim('“').trim('”').trim('\'')
    }    

    // Latest Emit JSON to JS module (with queue clearing on success)
    fun emitJson(json: String) {
      android.util.Log.e("BashChatTest", ">>> emitJson called with: $json")

      // Always queue latest via reflection
      try {
        val cls = Class.forName("com.anonymous.realtimechatexpo.BashShareQueue")
        val method = cls.getMethod("setPending", String::class.java)
        method.invoke(null, json)
        android.util.Log.e("BashChatTest", ">>> Queued JSON into BashShareQueue: $json")
      } catch (e: Exception) {
        android.util.Log.e("BashChatTest", "!!! Failed to queue JSON: ${e.message}", e)
      }
      
      // ❌ Do not call notifyShareReceived here
      // ✅ JS will call consumePendingShare() to fetch it
      pendingShareIntent = intent
      pendingShareStatic = intent
    }

    // --- FIX #1: Emit text whenever EXTRA_TEXT exists (type-agnostic) ---
    val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
    if (!sharedText.isNullOrEmpty()) {
        val cleaned = normalizeText(sharedText ?: "")
        val json = """{"kind":"text","text":${escapeJson(cleaned)}}"""
        android.util.Log.e("BashChatTest", ">>> Built text JSON (type-agnostic): $json")
        emitJson(json)
        android.util.Log.e("BashChatTest", ">>> Called emitJson with text payload")
        return
    }

    // --- FIX #2: Relax action gating to allow SEND_MULTIPLE and VIEW ---
    val isSend = action == Intent.ACTION_SEND
    val isSendMultiple = action == Intent.ACTION_SEND_MULTIPLE
    val isView = action == Intent.ACTION_VIEW

    if (!isSend && !isSendMultiple && !isView) {
        android.util.Log.e("BashChatTest", ">>> Unsupported action: $action")
        return
    }    

    // TEXT via type (secondary path for clipData text)
    if (type.startsWith("text/")) {
        val clip = intent.clipData
        val clipText = if (clip != null && clip.itemCount > 0) clip.getItemAt(0).text else null
        if (!clipText.isNullOrEmpty()) {
            val cleaned = normalizeText(clipText?.toString() ?: "")
            val json = """{"kind":"text","text":${escapeJson(cleaned)}}"""
            android.util.Log.e("BashChatTest", ">>> Built text JSON (clip): $json")
            emitJson(json)
            android.util.Log.e("BashChatTest", ">>> Called emitJson with (clip) text payload")
            return
        }
    }

    // STREAMS: image/audio/video/pdf
    val streamUri: android.net.Uri? = intent.getParcelableExtra(Intent.EXTRA_STREAM)
        ?: intent.clipData?.let { if (it.itemCount > 0) it.getItemAt(0).uri else null }

    if (streamUri != null) {
      val resolver = applicationContext.contentResolver
      val mime = resolver.getType(streamUri) ?: type
      val base64 = readUriToBase64(resolver, streamUri)
      val filename = guessFilename(resolver, streamUri)

      val json = when {
          mime.startsWith("image/") ->
              """{"kind":"image","payload":{"base64":"$base64","filename":${escapeJson(filename)}}}"""
          mime.startsWith("video/") ->
              """{"kind":"video","payload":{"video":"$base64","video_filename":${escapeJson(filename)}}}"""
          mime.startsWith("audio/") ->
              """{"kind":"voice","payload":{"base64":"$base64","filename":${escapeJson(filename)}}}"""
          mime == "application/pdf" ->
              """{"kind":"document","payload":{"base64":"$base64","filename":${escapeJson(filename)}}}"""
          else ->
              """{"kind":"uri","uri":${escapeJson(streamUri.toString())},"mime":${escapeJson(mime)}}"""
      }

      android.util.Log.e("BashChatTest", ">>> Built stream JSON: $json")
      emitJson(json)    
      android.util.Log.e("BashChatTest", ">>> Called emitJson with stream payload")    
      return
    }

    // Fallbacks
    val clip = intent.clipData
    val item = if (clip != null && clip.itemCount > 0) clip.getItemAt(0) else null
    val anyText = item?.text
    val anyUri = item?.uri
    if (!anyText.isNullOrEmpty()) {
      val cleaned = normalizeText(stripUrls(anyText?.toString() ?: ""))
      val json = """{"kind":"text","text":${escapeJson(cleaned)}}"""
      android.util.Log.e("BashChatTest", ">>> Built fallback text JSON: $json")
      emitJson(json)
      return
    }
    if (anyUri != null) {
      val mime = applicationContext.contentResolver.getType(anyUri) ?: type
      val json = """{"kind":"uri","uri":${escapeJson(anyUri.toString())},"mime":${escapeJson(mime)}}"""
      android.util.Log.e("BashChatTest", ">>> Built fallback uri JSON: $json")
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
      android.util.Log.e("BashChatTest", "readUriToBase64 failed: ${e.message}", e)
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
      mime.startsWith("image/") -> "share_${System.currentTimeMillis()}.jpg"
      mime.startsWith("video/") -> "share_${System.currentTimeMillis()}.mp4"
      mime.startsWith("audio/") -> "share_${System.currentTimeMillis()}.m4a"
      mime == "application/pdf" -> "share_${System.currentTimeMillis()}.pdf"
      else -> "share_${System.currentTimeMillis()}.bin"
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
