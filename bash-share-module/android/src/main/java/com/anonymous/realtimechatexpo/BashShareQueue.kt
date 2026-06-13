package com.anonymous.realtimechatexpo

object BashShareQueue {
  private const val PREF_NAME = "BashShareQueuePrefs"
  private const val KEY_PENDING = "pending_share"

  // Store application context here
  private lateinit var appContext: android.content.Context

  // Initialize once from Application class
  @JvmStatic fun init(context: android.content.Context) {
    appContext = context.applicationContext
  }

  @JvmStatic fun setPending(value: String?) {
    getPrefs().edit().putString(KEY_PENDING, value).apply()
  }

  @JvmStatic fun consume(): String? {
    val prefs = getPrefs()
    val v = prefs.getString(KEY_PENDING, null)
    if (v != null) {
      prefs.edit().remove(KEY_PENDING).apply()
    }
    return v
  }

  @JvmStatic fun peek(): String? = getPrefs().getString(KEY_PENDING, null)

  @JvmStatic fun clear() {
    getPrefs().edit().remove(KEY_PENDING).apply()
  }

  private fun getPrefs(): android.content.SharedPreferences {
    return appContext.getSharedPreferences(PREF_NAME, android.content.Context.MODE_PRIVATE)
  }
}
