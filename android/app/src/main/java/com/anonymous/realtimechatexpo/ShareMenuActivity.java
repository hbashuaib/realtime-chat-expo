package com.anonymous.realtimechatexpo;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;
import android.util.Log;
import android.net.Uri;

import java.util.ArrayList;

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
    Log.d(TAG, "clipData=" + incoming.getClipData());
    Log.d(TAG, "extras=" + (incoming.getExtras() != null ? incoming.getExtras().toString() : "null"));

    Intent main = new Intent(this, MainActivity.class);
    main.setAction(incoming.getAction());
    main.setType(incoming.getType());
    main.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP
      | Intent.FLAG_ACTIVITY_CLEAR_TOP
      | Intent.FLAG_ACTIVITY_NEW_TASK
      | Intent.FLAG_GRANT_READ_URI_PERMISSION);

    // Copy data/clipData
    if (incoming.getData() != null) main.setData(incoming.getData());
    if (incoming.getClipData() != null) main.setClipData(incoming.getClipData());

    // Forward any remaining extras first
    if (incoming.getExtras() != null) {
      main.putExtras(incoming.getExtras());
    }

    // Then overwrite with explicit text/stream to ensure they survive
    if (Intent.ACTION_SEND.equals(incoming.getAction())) {
      final Uri single = incoming.getParcelableExtra(Intent.EXTRA_STREAM);
      final String text = incoming.getStringExtra(Intent.EXTRA_TEXT);
      if (single != null) main.putExtra(Intent.EXTRA_STREAM, single);
      if (text != null) main.putExtra(Intent.EXTRA_TEXT, text);
    } else if (Intent.ACTION_SEND_MULTIPLE.equals(incoming.getAction())) {
      final ArrayList<Uri> list = incoming.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
      if (list != null) main.putParcelableArrayListExtra(Intent.EXTRA_STREAM, list);
    }

    startActivity(main);
    finish();
  }
}
