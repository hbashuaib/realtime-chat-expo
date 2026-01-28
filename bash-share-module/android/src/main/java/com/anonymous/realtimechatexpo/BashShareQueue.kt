package com.anonymous.realtimechatexpo

object BashShareQueue {
  @Volatile private var pending: String? = null

  @JvmStatic fun setPending(value: String?) {
    pending = value
  }

  @JvmStatic fun consume(): String? {
    val v = pending
    pending = null
    return v
  }

  @JvmStatic fun peek(): String? {
    return pending
  }
}
