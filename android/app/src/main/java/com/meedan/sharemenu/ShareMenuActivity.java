
package com.meedan.sharemenu;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

import com.anonymous.realtimechatexpo.MainActivity;


public class ShareMenuActivity extends Activity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    Intent main = new Intent(this, MainActivity.class);
    main.setAction(getIntent().getAction());
    main.setType(getIntent().getType());
    main.setData(getIntent().getData());
    main.putExtras(getIntent());
    main.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

    startActivity(main);
    finish();
  }
}
