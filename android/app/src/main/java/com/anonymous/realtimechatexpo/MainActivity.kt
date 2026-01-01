package com.anonymous.realtimechatexpo
import expo.modules.splashscreen.SplashScreenManager
import android.content.Intent
import android.net.Uri
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.ReactApplication
import com.facebook.react.bridge.ReactContext
import com.facebook.react.ReactInstanceEventListener

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
    private var pendingShareIntent: Intent? = null

  override fun onCreate(savedInstanceState: Bundle?) {
        android.widget.Toast.makeText(this, "MainActivity started", android.widget.Toast.LENGTH_SHORT).show()
        android.util.Log.e("BashChatTest", ">>> MainActivity onCreate fired with intent: " + getIntent())
        val intent = getIntent()
        if (intent != null && intent.action != Intent.ACTION_MAIN) {
          emitShareIntentToJS(intent)
        }
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    // setTheme(R.style.AppTheme);
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
}
