package com.anonymous.realtimechatexpo

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class BashSharePackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
    val modules = mutableListOf<NativeModule>()
    modules.add(BashShareModule(reactContext))
    android.util.Log.e("BashChatTest", ">>> BashSharePackage creating BashShareModule")
    return modules
  }

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
    return emptyList()
  }
}
