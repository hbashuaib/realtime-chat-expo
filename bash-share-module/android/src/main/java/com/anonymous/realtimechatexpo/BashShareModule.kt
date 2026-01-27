package com.anonymous.realtimechatexpo

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

@ReactModule(name = "BashShareModule")
class BashShareModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "BashShareModule"

  // Required for NativeEventEmitter
  @ReactMethod
  fun addListener(eventName: String) { /* no-op */ }

  @ReactMethod
  fun removeListeners(count: Int) { /* no-op */ }

  // ✅ NEW: trivial test method to confirm bridge works
  @ReactMethod
  fun ping(promise: Promise) {
    promise.resolve("pong from native")
  }


  @ReactMethod
  fun consumePendingShare(promise: Promise) {
    try {
      val v = BashShareQueue.consume()
      promise.resolve(v)
    } catch (e: Exception) {
      promise.reject("ERR_CONSUME_PENDING", e)
    }
  }

  // Explicitly expose notifyShareReceived to JS
  @ReactMethod
  fun notifyShareReceived(json: String) {
    if (reactApplicationContext.hasActiveCatalystInstance()) {
      reactApplicationContext
        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
        .emit("onShareReceived", json)
    }
  }
}
