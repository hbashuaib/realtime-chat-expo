package com.anonymous.realtimechatexpo;

import android.app.Activity;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

public class ShareMenuActivityCanary extends Activity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    Log.i("BashChatShare", "CANARY onCreate fired");
    Toast.makeText(this, "Share received (Canary)", Toast.LENGTH_SHORT).show();
    finish();
  }
}
