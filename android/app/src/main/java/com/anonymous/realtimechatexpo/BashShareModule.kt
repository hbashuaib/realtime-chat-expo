package com.anonymous.realtimechatexpo

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

// object BashShareQueue {
//   @Volatile private var pending: String? = null

//   fun setPending(value: String?) {
//     pending = value
//   }

//   fun consume(): String? {
//     val v = pending
//     pending = null
//     return v
//   }
// }

// class BashShareModule(reactContext: ReactApplicationContext) :
//   ReactContextBaseJavaModule(reactContext) {

//   override fun getName(): String = "BashShareModule"

//   @ReactMethod
//   fun consumePendingShare(promise: Promise) {
//     try {
//       val v = BashShareQueue.consume()
//       if (v == null) {
//         promise.resolve(null)
//       } else {
//         promise.resolve(v)
//       }
//     } catch (e: Exception) {
//       promise.reject("ERR_CONSUME_PENDING", e)
//     }
//   }
// }

// Revised BashShareQueue with safe peek for retries
class BashShareModule(reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = "BashShareModule"

  @ReactMethod
  fun consumePendingShare(promise: Promise) {
    try {
      val v = BashShareQueue.peek() // ✅ safe retries
      promise.resolve(v)
    } catch (e: Exception) {
      promise.reject("ERR_CONSUME_PENDING", e)
    }
  }
}

