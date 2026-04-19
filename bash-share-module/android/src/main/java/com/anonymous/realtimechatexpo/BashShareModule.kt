package com.anonymous.realtimechatexpo

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.modules.core.DeviceEventManagerModule
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments

@ReactModule(name = BashShareModule.NAME)
class BashShareModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "BashShareModule"
        const val EVENT_SHARE_RECEIVED = "onShareReceived"
    }

    init {
        android.util.Log.e("BashChatTest", ">>> BashShareModule instance created")
    }

    // override fun getName(): String = "BashShareModule"
    // override fun getName(): String {
    //     android.util.Log.e("BashChatTest", ">>> BashShareModule registered with name: $NAME")
    //     return NAME
    // }

    override fun getName(): String = NAME

    // Tell RN which events this module can emit
    override fun getConstants(): MutableMap<String, Any> {
        return mutableMapOf(
            "supportedEvents" to listOf(EVENT_SHARE_RECEIVED)
        )
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
            // Log current queue state before consuming
            val peek = BashShareQueue.peek()
            android.util.Log.e("BashChatTest", ">>> consumePendingShare peek before consume: $peek")

            // Actually consume the pending payload
            val v = BashShareQueue.consume()

            if (v != null) {
                // Always resolve as String
                promise.resolve(v.toString())
            } else {
                promise.resolve(null)
            }

            // Log what is being returned to JS
            android.util.Log.e("BashChatTest", ">>> consumePendingShare returning: $v")

            // promise.resolve(v)
        } catch (e: Exception) {
            android.util.Log.e("BashChatTest", "!!! consumePendingShare error: ${e.message}", e)
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
            if (result != null) {
                promise.resolve(result.toString())
            } else {
                promise.resolve(null)
            }

            // promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_PEEK_PENDING", e)
        }
    }

    // JS-facing version (called from JS, resolves a Promise)
    @ReactMethod
    fun flushPendingShare(promise: Promise) {
        try {
            val pending = BashShareQueue.peek()   // only peek, don’t consume yet
            if (pending != null) {
                android.util.Log.e("BashChatTest", ">>> flushPendingShare found pending: $pending")
                if (reactApplicationContext.hasActiveCatalystInstance()) {
                    val emitter = reactApplicationContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    // Emit raw JSON string to JS
                    emitter.emit("onShareReceived", pending.toString())
                    android.util.Log.e("BashChatTest", ">>> flushPendingShare emitted to JS with payload: $pending")
                    // ✅ Do not consume here — leave it queued
                    promise.resolve("emitted")
                } else {
                    promise.resolve("queued")
                    android.util.Log.e("BashChatTest", ">>> Catalyst not active, payload left queued")
                }
            } else {
                promise.resolve("nothing")
                android.util.Log.e("BashChatTest", ">>> flushPendingShare found nothing")
            }
        } catch (e: Exception) {
            promise.reject("ERR_FLUSH_PENDING", e)
            android.util.Log.e("BashChatTest", "!!! Exception in flushPendingShare: ${e.message}", e)
        }
    }

    // Internal native helper (called from MainActivity/plugin injection, no Promise)
    fun flushPendingShareInternal() {
        try {
            val pending = BashShareQueue.peek()
            if (pending != null) {
                android.util.Log.e("BashChatTest", ">>> flushPendingShareInternal found pending: $pending")
                if (reactApplicationContext.hasActiveCatalystInstance()) {
                    val emitter = reactApplicationContext
                        .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                    // Emit raw JSON string to JS
                    emitter.emit("onShareReceived", pending.toString())
                    android.util.Log.e("BashChatTest", ">>> flushPendingShareInternal emitted to JS with payload: $pending")
                    // ❌ Do not consume here
                    // ✅ Leave it queued so JS can call consumePendingShare()
                } else {
                    android.util.Log.e("BashChatTest", ">>> Catalyst not active, payload left queued")
                }
            } else {
                android.util.Log.e("BashChatTest", ">>> flushPendingShareInternal found nothing")
            }
        } catch (e: Exception) {
            android.util.Log.e("BashChatTest", "!!! Exception in flushPendingShareInternal: ${e.message}", e)
        }
    }
}
