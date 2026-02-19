package com.anonymous.realtimechatexpo

object BashShareQueue {
  @Volatile private var pending: String? = null

  @JvmStatic fun setPending(value: String?) {
    pending = value
  }

  // Only clear when JS explicitly consumes
  @JvmStatic fun consume(): String? {
    val v = pending
    if (v != null) {
      // Clear only after returning a non-null payload
      pending = null
    }
    return v
  }

  @JvmStatic fun peek(): String? {
    return pending
  }
}