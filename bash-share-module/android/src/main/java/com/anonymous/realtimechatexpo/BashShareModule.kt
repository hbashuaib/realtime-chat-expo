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

    override fun getName(): String = NAME

    override fun getConstants(): MutableMap<String, Any> {
        return mutableMapOf("supportedEvents" to listOf(EVENT_SHARE_RECEIVED))
    }

    @ReactMethod fun addListener(eventName: String) { /* no-op */ }
    @ReactMethod fun removeListeners(count: Int) { /* no-op */ }

    @ReactMethod
    fun ping(promise: Promise) {
        promise.resolve("pong from native")
    }

    @ReactMethod
    fun consumePendingShare(promise: Promise) {
        try {
            val result = BashShareQueue.consume() // new atomic get+clear
            if (result != null) {
                promise.resolve(result.toString())
                android.util.Log.e("BashChatTest", ">>> consumePendingShare returning and cleared: $result")
            } else {
                promise.resolve(null)
                android.util.Log.e("BashChatTest", ">>> consumePendingShare found nothing")
            }
        } catch (e: Exception) {
            promise.reject("ERR_CONSUME_PENDING", e)
        }
    }

    @ReactMethod
    fun notifyShareReceived(json: String) {
        if (reactApplicationContext.hasActiveCatalystInstance()) {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(EVENT_SHARE_RECEIVED, json)
        }
    }

    @ReactMethod
    fun peekPendingShare(promise: Promise) {
        try {
            val result = BashShareQueue.peek()
            promise.resolve(result?.toString())
        } catch (e: Exception) {
            promise.reject("ERR_PEEK_PENDING", e)
        }
    }

    fun flushPendingShareInternal() {
        val pending = BashShareQueue.consume() // ✅ consume instead of peek
        if (pending != null && reactApplicationContext.hasActiveCatalystInstance()) {
            val emitter = reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            emitter.emit(EVENT_SHARE_RECEIVED, pending.toString())
            android.util.Log.e("BashChatTest", ">>> flushPendingShareInternal emitted and consumed: $pending")
        } else {
            android.util.Log.e("BashChatTest", ">>> flushPendingShareInternal found nothing or Catalyst inactive")
        }
    }

    @ReactMethod
    fun flushPendingShare(promise: Promise) {
        val pending = BashShareQueue.consume() // ✅ consume instead of peek
        if (pending != null && reactApplicationContext.hasActiveCatalystInstance()) {
            val emitter = reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            emitter.emit(EVENT_SHARE_RECEIVED, pending.toString())
            android.util.Log.e("BashChatTest", ">>> flushPendingShare emitted and consumed: $pending")
            promise.resolve("emitted") // ✅ keep this line
        } else {
            promise.resolve("nothing")
            android.util.Log.e("BashChatTest", ">>> flushPendingShare found nothing or Catalyst inactive")
        }
    }

    // ✅ New explicit methods
    @ReactMethod
    fun getPendingShare(promise: Promise) {
        val pending = BashShareQueue.getPending()
        if (pending != null) {
            promise.resolve(pending.toString())
            android.util.Log.e("BashChatTest", ">>> getPendingShare returning: $pending")
        } else {
            promise.resolve(null)
            android.util.Log.e("BashChatTest", ">>> getPendingShare found nothing")
        }
    }

    @ReactMethod
    fun clearPendingShare(promise: Promise) {
        val hadValue = BashShareQueue.clearPending()
        promise.resolve(hadValue)
        android.util.Log.e("BashChatTest", ">>> clearPendingShare cleared, hadValue=$hadValue")
    }
}