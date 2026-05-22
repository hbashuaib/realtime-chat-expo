package com.anonymous.realtimechatexpo

object BashShareQueue {
  private const val PREF_NAME = "BashShareQueuePrefs"
  private const val KEY_PENDING = "pending_share"

  // Store application context here
  private var appContext: android.content.Context? = null

  // Initialize once from BashShareModule
  @JvmStatic fun init(context: android.content.Context) {
    appContext = context.applicationContext
  }

  @JvmStatic fun setPending(value: String?) {
    val prefs = getPrefs()
    prefs?.edit()?.putString(KEY_PENDING, value)?.apply()
  }

  @JvmStatic fun consume(): String? {
    val prefs = getPrefs()
    val v = prefs?.getString(KEY_PENDING, null)
    if (v != null) {
      prefs.edit()?.remove(KEY_PENDING)?.apply()
    }
    return v
  }

  @JvmStatic fun peek(): String? {
    val prefs = getPrefs()
    return prefs?.getString(KEY_PENDING, null)
  }

  @JvmStatic fun clear() {
    val prefs = getPrefs()
    prefs?.edit()?.remove(KEY_PENDING)?.apply()
  }

  // Helper to safely get SharedPreferences
  private fun getPrefs(): android.content.SharedPreferences? {
    return appContext?.getSharedPreferences(PREF_NAME, android.content.Context.MODE_PRIVATE)
  }
}
