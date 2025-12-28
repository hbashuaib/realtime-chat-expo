
package com.anonymous.realtimechatexpo;

import android.content.Intent;
import android.os.Bundle;
import androidx.appcompat.app.AppCompatActivity;
import android.net.Uri;
import android.content.ClipData;
import android.util.Log;

public class ShareMenuActivity extends AppCompatActivity {
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    try {
      Log.e("BashChatTest", ">>> ShareMenuActivity onCreate fired with intent: " + getIntent());
      handleIncomingIntent(getIntent());
    } catch (Exception e) {
      Log.e("BashChatTest", "!!! Exception in onCreate: " + e.getMessage(), e);
    }
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    try {
      Log.e("BashChatTest", ">>> ShareMenuActivity onNewIntent fired with intent: " + intent);
      handleIncomingIntent(intent);
    } catch (Exception e) {
      Log.e("BashChatTest", "!!! Exception in onNewIntent: " + e.getMessage(), e);
    }
  }

  private void handleIncomingIntent(Intent incoming) {
    if (incoming == null) {
      Log.e("BashChatTest", "!!! Incoming intent is null");
      return;
    }

    Intent forward = new Intent(this, MainActivity.class);
    forward.setAction(incoming.getAction());
    forward.setType(incoming.getType());
    forward.putExtras(incoming);

    ClipData clip = incoming.getClipData();
    if (clip != null) {
      forward.setClipData(clip);
    }

    forward.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    forward.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

    Uri data = incoming.getData();
    if (data != null) {
      forward.setData(data);
    }

    try {
      startActivity(forward);
      Log.e("BashChatTest", ">>> Forwarded intent to MainActivity successfully");
    } catch (Exception e) {
      Log.e("BashChatTest", "!!! Exception while starting MainActivity: " + e.getMessage(), e);
    }

    finish();
  }
}
