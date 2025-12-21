package com.anonymous.realtimechatexpo;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;

public class ShareMenuActivity extends Activity {
  private static final String TAG = "ShareMenuActivity";

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    Intent incoming = getIntent();
    if (incoming == null) {
      Log.w(TAG, "No incoming intent");
      finish();
      return;
    }

    Log.d(TAG, "action=" + incoming.getAction());
    Log.d(TAG, "type=" + incoming.getType());
    Log.d(TAG, "data=" + incoming.getData());
    Log.d(TAG, "extras=" + (incoming.getExtras() != null ? incoming.getExtras().toString() : "null"));

    Intent main = new Intent(this, MainActivity.class);
    main.setAction(incoming.getAction());
    main.setType(incoming.getType());
    main.setData(incoming.getData());
    if (incoming.getExtras() != null) {
      main.putExtras(incoming.getExtras());
    }
    main.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP
      | Intent.FLAG_ACTIVITY_CLEAR_TOP
      | Intent.FLAG_GRANT_READ_URI_PERMISSION);

    startActivity(main);
    finish();
  }
}
