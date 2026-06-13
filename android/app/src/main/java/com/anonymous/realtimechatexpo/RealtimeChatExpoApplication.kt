package com.anonymous.realtimechatexpo

import android.app.Application

class RealtimeChatExpoApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        BashShareQueue.init(this)
        android.util.Log.e("BashChatTest", ">>> RealtimeChatExpoApplication started")
    }
}

