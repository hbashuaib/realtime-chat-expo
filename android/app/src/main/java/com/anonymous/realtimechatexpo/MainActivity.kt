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

  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
  // >>> MainActivity onCreate injected
  android.widget.Toast.makeText(this, "MainActivity started", android.widget.Toast.LENGTH_SHORT).show()
  android.util.Log.e("BashChatTest", ">>> MainActivity onCreate fired with intent: " + getIntent())
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
    val manager = (application as ReactApplication).reactNativeHost.reactInstanceManager
    val toForward = pendingShareIntent ?: pendingShareStatic
    if (toForward != null) {
      val handler = android.os.Handler(android.os.Looper.getMainLooper())
      handler.postDelayed(object : Runnable {
        override fun run() {
          val context = manager.currentReactContext
          if (context != null) {
            android.util.Log.e("BashChatTest", ">>> onResume retry flush: forwarding pending share")
            forwardIntentToJS(context, toForward)
            pendingShareIntent = null
            pendingShareStatic = null
          } else {
            android.util.Log.e("BashChatTest", ">>> onResume retry flush: context still null, retrying…")
            handler.postDelayed(this, 500)
          }
        }
      }, 500)
    } else {
      android.util.Log.e("BashChatTest", ">>> onResume: nothing queued to forward")
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
      android.util.Log.e("BashChatTest", ">>> ReactContext not ready, queuing share")
      pendingShareIntent = intent
      pendingShareStatic = intent

      manager.addReactInstanceEventListener(object : ReactInstanceEventListener {
        override fun onReactContextInitialized(readyContext: ReactContext) {
          android.util.Log.e("BashChatTest", ">>> ReactContext ready; scheduling flushes")
          val handler = android.os.Handler(android.os.Looper.getMainLooper())

          handler.postDelayed({
            val toForward = pendingShareIntent ?: pendingShareStatic
            android.util.Log.e("BashChatTest", ">>> Delayed flush (2500ms). instance=$pendingShareIntent static=$pendingShareStatic")
            if (toForward != null) {
              // forward on UI thread
              handler.post {
                forwardIntentToJS(readyContext, toForward)
              }
              pendingShareIntent = null
              // ❌ Keep static for secondary attempt
            }
          }, 2500)

          handler.postDelayed({
            val toForward2 = pendingShareIntent ?: pendingShareStatic
            android.util.Log.e("BashChatTest", ">>> Secondary flush (5000ms). instance=$pendingShareIntent static=$pendingShareStatic")
            if (toForward2 != null) {
              handler.post {
                forwardIntentToJS(readyContext, toForward2)
              }
              pendingShareIntent = null
              pendingShareStatic = null // ✅ finally clear static
            }
          }, 5000)

          manager.removeReactInstanceEventListener(this)
        }
      })

      // Force-create React context unconditionally
      android.util.Log.e("BashChatTest", ">>> Forcing React context creation in background")
      try {
        manager.createReactContextInBackground()
      } catch (e: Exception) {
        android.util.Log.e("BashChatTest", "!!! Failed to create React context: ${e.message}", e)
      }

      // Fallback recreate if still null at ~3500ms
      android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
        if (manager.currentReactContext == null) {
          android.util.Log.e("BashChatTest", ">>> Recreating React context in background (fallback)")
          try {
            manager.recreateReactContextInBackground()
          } catch (e: Exception) {
            android.util.Log.e("BashChatTest", "!!! Failed to recreate React context: ${e.message}", e)
          }
        }
      }, 3500)

      return
    }

    // forward on UI thread
    val uiHandler = android.os.Handler(android.os.Looper.getMainLooper())
    uiHandler.post {
      forwardIntentToJS(context, intent)
    }
  }

  private fun forwardIntentToJS(context: ReactContext, intent: Intent) {
    val action = intent.action
    val type = intent.type ?: ""
    android.util.Log.e("BashChatTest", ">>> forwardIntentToJS: action=$action type=$type")

    if (Intent.ACTION_SEND != action) {
        android.util.Log.e("BashChatTest", ">>> Non-SEND action received: $action")
        return
    }

    fun emitJson(json: String) {
        com.anonymous.realtimechatexpo.BashShareQueue.setPending(json)
        val uiHandler = android.os.Handler(android.os.Looper.getMainLooper())
        uiHandler.post {
            try {
                android.util.Log.e("BashChatTest", ">>> Emitting to JS: $json")
                context.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    .emit("onShareReceived", json)
            } catch (e: Exception) {
                android.util.Log.e("BashChatTest", "!!! Failed to emit to JS: ${e.message}", e)
            }
        }
    }

    // TEXT: strip URLs
    if (type.startsWith("text/")) {
        val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
        if (!sharedText.isNullOrEmpty()) {
            val cleaned = stripUrls(sharedText)
            val json = """{"kind":"text","text":${escapeJson(cleaned)}}"""
            android.util.Log.e("BashChatTest", ">>> Built text JSON: $json")
            emitJson(json)
            return
        }
        val clip = intent.clipData
        val clipText = if (clip != null && clip.itemCount > 0) clip.getItemAt(0).text else null
        if (!clipText.isNullOrEmpty()) {
            val cleaned = stripUrls(clipText.toString())
            val json = """{"kind":"text","text":${escapeJson(cleaned)}}"""
            android.util.Log.e("BashChatTest", ">>> Built text JSON (clip): $json")
            emitJson(json)
            return
        }
        return
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
        return
    }

    // Fallbacks
    val clip = intent.clipData
    val item = if (clip != null && clip.itemCount > 0) clip.getItemAt(0) else null
    val anyText = item?.text
    val anyUri = item?.uri
    if (!anyText.isNullOrEmpty()) {
        val cleaned = stripUrls(anyText.toString())
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

  private fun escapeJson(raw: String): String {
    val s = raw.replace("\\", "\\\\")
               .replace("\"", "\\\"")
               .replace("\n", "\\n")
               .replace("\r", "\\r")
    return "\"$s\""
  }

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

  private fun stripUrls(text: String): String {
    val urlRegex = Regex("\\bhttps?://\\S+", RegexOption.IGNORE_CASE)
    return text.replace(urlRegex, "")
               .replace("\n", " ")
               .replace(Regex("\\s{2,}"), " ")
               .trim()
  }
}
