// plugins/sharemenu/ShareMenuActivity.java
package com.meedan.sharemenu;

import com.anonymous.realtimechatexpo.MainActivity; // <-- ensure correct package

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

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




// // plugins/sharemenu/ShareMenuActivity.java
// package com.reactnativesharemenu;

// import android.content.Intent;
// import android.os.Bundle;
// import com.facebook.react.ReactActivity;

// public class ShareMenuActivity extends ReactActivity {

//   @Override
//   protected void onCreate(Bundle savedInstanceState) {
//     super.onCreate(savedInstanceState);
//     // Just forward the intent to React Native; JS will handle it
//     setIntent(getIntent());
//   }

//   @Override
//   protected String getMainComponentName() {
//     // Must match the component name registered in JS (Expo uses "main")
//     return "main";
//   }

//   @Override
//   public void onNewIntent(Intent intent) {
//     super.onNewIntent(intent);
//     setIntent(intent);
//   }
// }