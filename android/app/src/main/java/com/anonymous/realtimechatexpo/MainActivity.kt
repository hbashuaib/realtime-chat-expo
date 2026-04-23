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

      // // Always flush BashShareQueue into JS
      // val pendingJson = com.anonymous.realtimechatexpo.BashShareQueue.peek() as? String
      // if (!pendingJson.isNullOrEmpty()) {
      //     android.util.Log.e("BashChatTest", ">>> Flushing BashShareQueue into JS via BashShareModule")
      //     val module = readyContext.getNativeModule(com.anonymous.realtimechatexpo.BashShareModule::class.java)
      //     module?.flushPendingShareInternal()

      //     // ❌ Do not flush or consume here
      //     // ✅ Leave it queued for JS to fetch via consumePendingShare()
      // }
      
      val handler = android.os.Handler(android.os.Looper.getMainLooper())

      // ✅ Schedule delayed flushes to JS in case React Native isn't ready to receive immediately
      handler.postDelayed({
          val module = readyContext.getNativeModule(com.anonymous.realtimechatexpo.BashShareModule::class.java)
          val pending = com.anonymous.realtimechatexpo.BashShareQueue.peek()
          if (pending != null) {
              android.util.Log.e("BashChatTest", ">>> Delayed flush (2500ms)")
              module?.flushPendingShareInternal()
          }
      }, 2500)

      handler.postDelayed({
          val module = readyContext.getNativeModule(com.anonymous.realtimechatexpo.BashShareModule::class.java)
          val pending = com.anonymous.realtimechatexpo.BashShareQueue.peek()
          if (pending != null) {
              android.util.Log.e("BashChatTest", ">>> Secondary flush (5000ms)")
              module?.flushPendingShareInternal()
          }
      }, 5000)

      handler.postDelayed({
          val module = readyContext.getNativeModule(com.anonymous.realtimechatexpo.BashShareModule::class.java)
          val pending = com.anonymous.realtimechatexpo.BashShareQueue.peek()
          if (pending != null) {
              android.util.Log.e("BashChatTest", ">>> Tertiary flush (8000ms)")
              module?.flushPendingShareInternal()
          }
      }, 8000)
      
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

  // ❌ Removed emitShareIntentToJS call
  // ✅ Only rely on listener + forwardIntentToJS when context is alive

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

  // ❌ Helper removed completely
  // ✅ Only keep forwardIntentToJS

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
            android.util.Log.e("BashChatTest", "!!! Failed to queue JSON: ${e.message}", e)
        }
          pendingShareIntent = intent
          pendingShareStatic = intent
      }

      // --- Text via EXTRA_TEXT ---
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      if (!sharedText.isNullOrEmpty()) {
          val cleaned = normalizeText(sharedText)
          val json = """{"kind":"text","text":${escapeJson(cleaned)}}"""
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
          val json = """{"kind":"text","text":${escapeJson(cleaned)}}"""
          emitJson(json)
          return
      }

      if (anyUri != null) {
          val mime = applicationContext.contentResolver.getType(anyUri) ?: type
          val json = """{"kind":"uri","uri":${escapeJson(anyUri.toString())},"mime":${escapeJson(mime)}}"""
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
