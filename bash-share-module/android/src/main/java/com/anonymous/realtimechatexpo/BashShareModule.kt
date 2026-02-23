package com.anonymous.realtimechatexpo

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments


class BashShareModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    init {
        android.util.Log.e("BashChatTest", ">>> BashShareModule instance created")
    }


    // override fun getName(): String = "BashShareModule"
    override fun getName(): String {
        android.util.Log.e("BashChatTest", ">>> BashShareModule registered with name: BashShareModule")
        return "BashShareModule"
    }
    

    // Required for NativeEventEmitter
    @ReactMethod
    fun addListener(eventName: String) { /* no-op */ }

    @ReactMethod
    fun removeListeners(count: Int) { /* no-op */ }

    // NEW: trivial test method to confirm bridge works
    @ReactMethod
    fun ping(promise: Promise) {
        promise.resolve("pong from native")
    }


    @ReactMethod
    fun consumePendingShare(promise: Promise) {
        try {
            val v = BashShareQueue.consume()
            android.util.Log.e("BashChatTest", ">>> consumePendingShare called, returning: $v")
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

    @ReactMethod
    fun peekPendingShare(promise: Promise) {
        try {
            val result = BashShareQueue.peek()
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_PEEK_PENDING", e)
        }
    }

    @ReactMethod
    fun flushPendingShare() {
        try {
            val pending = BashShareQueue.peek()   // only peek, don’t consume yet
            if (pending != null) {
                android.util.Log.e("BashChatTest", ">>> flushPendingShare found pending: $pending")
                if (reactApplicationContext.hasActiveCatalystInstance()) {
                    val emitter = reactApplicationContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    emitter.emit("onShareReceived", pending)
                    android.util.Log.e("BashChatTest", ">>> flushPendingShare emitted to JS successfully")
                } else {
                    android.util.Log.e("BashChatTest", ">>> Catalyst not active, leaving payload queued")
                }
            } else {
                android.util.Log.e("BashChatTest", ">>> flushPendingShare found nothing")
            }
        } catch (e: Exception) {
            android.util.Log.e("BashChatTest", "!!! Exception in flushPendingShare: ${e.message}", e)
        }
    }
}
