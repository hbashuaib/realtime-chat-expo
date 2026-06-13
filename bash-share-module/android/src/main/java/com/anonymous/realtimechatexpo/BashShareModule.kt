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
        // ✅ Queue already initialized in RealtimeChatExpoApplication
        // Do not call BashShareQueue.init() here anymore
    }
    

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
    // Internal helper (no Promise, used by MainActivity if needed)
    fun flushPendingShareInternal() {
        val pending = BashShareQueue.peek()
        if (pending != null && reactApplicationContext.hasActiveCatalystInstance()) {
            val emitter = reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            emitter.emit(EVENT_SHARE_RECEIVED, pending.toString())
            android.util.Log.e("BashChatTest", ">>> flushPendingShareInternal emitted: $pending")
        } else {
            android.util.Log.e("BashChatTest", ">>> flushPendingShareInternal found nothing or Catalyst inactive")
        }
    }

    @ReactMethod
    fun flushPendingShare(promise: Promise) {
        val pending = BashShareQueue.peek()
        if (pending != null && reactApplicationContext.hasActiveCatalystInstance()) {
            val emitter = reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            emitter.emit(EVENT_SHARE_RECEIVED, pending.toString())
            android.util.Log.e("BashChatTest", ">>> flushPendingShare emitted: $pending")
            promise.resolve("emitted")
        } else {
            promise.resolve("nothing")
            android.util.Log.e("BashChatTest", ">>> flushPendingShare found nothing or Catalyst inactive")
        }
    }

    @ReactMethod
    fun jsReady(promise: Promise) {
        android.util.Log.e("BashChatTest", ">>> jsReady acknowledged, JS is ready")

        // ✅ Do not consume here. Just signal readiness.
        val pending = BashShareQueue.peek()
        if (pending != null) {
            android.util.Log.e("BashChatTest", ">>> jsReady sees pending payload, waiting for requestPendingShare")
            promise.resolve("pending")
        } else {
            promise.resolve("nothing")
            android.util.Log.e("BashChatTest", ">>> jsReady found nothing (queue empty)")
        }
    }

    @ReactMethod
    fun requestPendingShare(promise: Promise) {
        val pending = BashShareQueue.peek()
        if (pending != null && reactApplicationContext.hasActiveCatalystInstance()) {
            val emitter = reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            emitter.emit(EVENT_SHARE_RECEIVED, pending.toString())
            android.util.Log.e("BashChatTest", ">>> requestPendingShare emitted: $pending")
            BashShareQueue.consume()   // ✅ consume only here
            android.util.Log.e("BashChatTest", ">>> requestPendingShare queue consumed")
            promise.resolve("emitted")
        } else {
            promise.resolve("nothing")
            android.util.Log.e("BashChatTest", ">>> requestPendingShare found nothing (queue empty)")
        }
    }


    fun notifyNewShareAvailable() {
        if (reactApplicationContext.hasActiveCatalystInstance()) {
            val emitter = reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            emitter.emit("NewShareAvailable", null)
            android.util.Log.e("BashChatTest", ">>> notifyNewShareAvailable fired")
        }
    }

    fun emitPendingShare() {
        val pending = BashShareQueue.peek()
        if (pending != null) {
            android.util.Log.e("BashChatTest", ">>> emitPendingShare called, but deferring to jsReady")
            // ✅ Do not emit here — let JS call jsReady() after listener is attached
        }
    }

}
