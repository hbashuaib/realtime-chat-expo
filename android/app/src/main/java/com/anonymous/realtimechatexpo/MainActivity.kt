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
          if (context != null) {
              val immediate = pendingShareIntent ?: pendingShareStatic
              if (immediate != null) {
                  android.util.Log.e("BashChatTest", ">>> Flushing pending share from onResume")
                  forwardIntentToJS(context, immediate)
              }
          }
      }
    
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

    val manager = (application as ReactApplication).reactNativeHost.reactInstanceManager
    val context = manager.currentReactContext

    if (context == null) {
      android.util.Log.e("BashChatTest", ">>> ReactContext not ready, queuing NEW share (overwrite)")
      pendingShareIntent = intent
      pendingShareStatic = intent

      try {
        android.util.Log.e("BashChatTest", ">>> Forcing React context creation in background")
        manager.createReactContextInBackground()
      } catch (e: Exception) {
        android.util.Log.e("BashChatTest", "!!! Failed to create React context: ${e.message}", e)
      }

      // manager.addReactInstanceEventListener(object : ReactInstanceEventListener {
      //   override fun onReactContextInitialized(readyContext: ReactContext) {
      //     android.util.Log.e("BashChatTest", ">>> ReactContext ready; scheduling flushes")
      //     val handler = android.os.Handler(android.os.Looper.getMainLooper())
        
      //     // Immediate flush as soon as context is ready
      //     val immediate = pendingShareIntent ?: pendingShareStatic
      //     if (immediate != null) {
      //       handler.post {
      //         android.util.Log.e("BashChatTest", ">>> Forwarding pending share immediately")
      //         forwardIntentToJS(readyContext, immediate)
      //         // Keep pending until JS confirms receipt via emitJson success
      //         // forwardIntentToJS will clear queues only after successful emit
      //         // Do not clear here; let emitJson decide
      //       }
      //     } else {
      //       android.util.Log.e("BashChatTest", ">>> No pending share at immediate flush")
      //     }

      //     // First delayed flush ~2.5s
      //     handler.postDelayed({
      //       val toForward = pendingShareIntent ?: pendingShareStatic
      //       android.util.Log.e("BashChatTest", ">>> Delayed flush (2500ms). instance=$pendingShareIntent static=$pendingShareStatic")
      //       if (toForward != null) {
      //         forwardIntentToJS(readyContext, toForward)
      //         // ❌ Do not clear here — emitJson clears after success
      //       }
      //     }, 2500)          

      //     // Second delayed flush ~5s
      //     handler.postDelayed({
      //       val toForward2 = pendingShareIntent ?: pendingShareStatic
      //       android.util.Log.e("BashChatTest", ">>> Secondary flush (5000ms). instance=$pendingShareIntent static=$pendingShareStatic")
      //       if (toForward2 != null) {
      //         forwardIntentToJS(readyContext, toForward2)
      //         // ❌ Do not clear here — emitJson clears after success
      //       }
      //     }, 5000)
          
      //     // Optional third flush ~8s
      //     handler.postDelayed({
      //       val toForward3 = pendingShareIntent ?: pendingShareStatic
      //       android.util.Log.e("BashChatTest", ">>> Tertiary flush (8000ms). instance=$pendingShareIntent static=$pendingShareStatic")
      //       if (toForward3 != null) {
      //         forwardIntentToJS(readyContext, toForward3)
      //       }
      //     }, 8000)

      //     manager.removeReactInstanceEventListener(this)
          
      //   }
      // })
      
      // // Fallback recreate if still null at ~3500ms
      // android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
      //   if (manager.currentReactContext == null) {
      //     android.util.Log.e("BashChatTest", ">>> ReactContext still null at fallback; skipping recreate to avoid AssertionError")
      //     // Do NOT call recreateReactContextInBackground here.
      //     // Leave pendingShareIntent queued; it will flush once context is ready.
      //   }
      // }, 3500) 

      return
    }

    // ReactContext is ready — forward immediately on UI thread
    val uiHandler = android.os.Handler(android.os.Looper.getMainLooper())
    uiHandler.post {
      forwardIntentToJS(context, intent)
      // ❌ Do not clear here — forwardIntentToJS clears after successful emit
    }
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
      // Always queue latest via reflection (safe if class missing)
      try {
        val cls = Class.forName("com.anonymous.realtimechatexpo.BashShareQueue")
        val method = cls.getMethod("setPending", String::class.java)
        method.invoke(null, json)
      } catch (e: Exception) {
        android.util.Log.e("BashChatTest", "Queue not available yet (reflection): ${e.message}", e)
      }

      // Emit only when context is active; run on UI thread and clear on success
      if (context != null && context.hasActiveCatalystInstance()) {
        val uiHandler = android.os.Handler(android.os.Looper.getMainLooper())
        uiHandler.post {
          var emitted = false
          try {            
            val bashShareModule = context.getNativeModule(BashShareModule::class.java)
            bashShareModule?.notifyShareReceived(json)
            emitted = true
            android.util.Log.e("BashChatTest", ">>> Emitted to JS (UI): $json")
          } catch (e: Exception) {
            android.util.Log.e("BashChatTest", "!!! Failed to emit to JS: ${e.message}", e)
          }

          if (emitted) {
            // Clear both queues after successful emit
            pendingShareIntent = null
            pendingShareStatic = null   
            // ❌ Do not consume BashShareQueue here; JS will pull/peek as needed         
          } else {
            // Keep pending for retries
            pendingShareIntent = intent
            pendingShareStatic = intent
          }
        }
      } else {
        android.util.Log.e("BashChatTest", ">>> ReactContext not active, queuing intent")
        pendingShareIntent = intent
        pendingShareStatic = intent
      }
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
