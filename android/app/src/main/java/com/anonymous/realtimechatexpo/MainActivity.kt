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
import com.anonymous.realtimechatexpo.BashShareQueue


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
        android.util.Log.e("BashChatTest", ">>> ReactContext ready; attempting flush")
        val module = readyContext.getNativeModule(BashShareModule::class.java)
        if (module != null) {
            module.flushPendingShareInternal()
            pendingShareIntent = null
            pendingShareStatic = null
            android.util.Log.e("BashChatTest", ">>> Flush after ReactContext init completed")
        } else {
            android.util.Log.e("BashChatTest", ">>> BashShareModule was null at ReactContext init")
        }
        manager.removeReactInstanceEventListener(this)
      }
  }) 

  // ✅ Handle cold start share intent  
  val intent = getIntent()
  if (intent != null && intent.action == Intent.ACTION_SEND) {
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      if (!sharedText.isNullOrEmpty()) {
          val cleaned = sharedText.trim().trim('"').trim('“').trim('”').trim('\'')
          val json = """{"kind":"text","payload":{"text":${escapeJson(cleaned)}}}"""
          BashShareQueue.setPending(json)
          android.util.Log.e("BashChatTest", ">>> Queued JSON into BashShareQueue (onCreate): $json")          
      }
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
          val json = """{"kind":"text","payload":{"text":${escapeJson(cleaned)}}}"""
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
              // ✅ Directly set pending without peeking
              BashShareQueue.setPending(json)
              android.util.Log.e("BashChatTest", ">>> forwardIntentToJS queued JSON into BashShareQueue: $json")

              // ✅ Immediately flush and consume if JS is alive
              val context = (application as ReactApplication).reactNativeHost.reactInstanceManager.currentReactContext
              if (context != null && context.hasActiveCatalystInstance()) {
                  val module = context.getNativeModule(BashShareModule::class.java)
                  module?.flushPendingShareInternal() // ✅ use @ReactMethod flush with Promise
                  android.util.Log.e("BashChatTest", ">>> forwardIntentToJS flushed and consumed immediately")
              } else {
                  // ✅ schedule a delayed flush once ReactContext is ready
                  val manager = (application as ReactApplication).reactNativeHost.reactInstanceManager
                  manager.addReactInstanceEventListener(object : ReactInstanceEventListener {
                      override fun onReactContextInitialized(readyContext: ReactContext) {
                          val module = readyContext.getNativeModule(BashShareModule::class.java)
                          module?.flushPendingShareInternal()
                          android.util.Log.e("BashChatTest", ">>> forwardIntentToJS flushed after ReactContext init")
                          manager.removeReactInstanceEventListener(this)
                      }
                  })
              }              
          } catch (e: Exception) {
              android.util.Log.e("BashChatTest", "!!! Failed to queue JSON: ${e.message}", e)
          }             
      }

      // --- Text via EXTRA_TEXT ---
      val sharedText = intent.getStringExtra(Intent.EXTRA_TEXT)
      if (!sharedText.isNullOrEmpty()) {
          val cleaned = normalizeText(sharedText)
          val json = """{"kind":"text","payload":{"text":${escapeJson(cleaned)}}}"""
          emitJson(json)
          // ✅ safe here, intent is in scope
          pendingShareIntent = intent
          pendingShareStatic = intent
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
          // ✅ safe here, intent is in scope
          pendingShareIntent = intent
          pendingShareStatic = intent
          return
      }

      // --- Fallbacks ---
      val clip = intent.clipData
      val item = if (clip != null && clip.itemCount > 0) clip.getItemAt(0) else null
      val anyText = item?.text
      val anyUri = item?.uri

      if (!anyText.isNullOrEmpty()) {
          val cleaned = normalizeText(stripUrls(anyText.toString()))
          val json = """{"kind":"text","payload":{"text":${escapeJson(cleaned)}}}"""
          emitJson(json)
          // ✅ safe here, intent is in scope
          pendingShareIntent = intent
          pendingShareStatic = intent
          return
      }

      if (anyUri != null) {
          val mime = applicationContext.contentResolver.getType(anyUri) ?: type
          val json = """{"kind":"uri","uri":${escapeJson(anyUri.toString())},"mime":${escapeJson(mime)}}"""
          emitJson(json)
          // ✅ safe here, intent is in scope
          pendingShareIntent = intent
          pendingShareStatic = intent
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
