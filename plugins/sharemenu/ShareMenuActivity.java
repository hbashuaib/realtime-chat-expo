// plugins/sharemenu/ShareMenuActivity.java
package com.meedan.sharemenu;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import java.util.ArrayList;

// IMPORTANT: Replace this import with your actual MainActivity package.
// If your MainActivity.java starts with "package com.anonymous.realtimechatexpo;",
// then this import is correct:
import com.anonymous.realtimechatexpo.MainActivity;

public class ShareMenuActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        Intent inbound = getIntent();
        Intent forward = new Intent(this, MainActivity.class);
        forward.setFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

        String action = inbound.getAction();
        String type = inbound.getType();

        if (Intent.ACTION_SEND.equals(action) && type != null) {
            if ("text/plain".equals(type)) {
                String sharedText = inbound.getStringExtra(Intent.EXTRA_TEXT);
                forward.putExtra("share.text", sharedText);
            } else if (type.startsWith("image/")) {
                Uri imageUri = inbound.getParcelableExtra(Intent.EXTRA_STREAM);
                if (imageUri != null) {
                    forward.putExtra("share.image", imageUri.toString());
                }
            }
        } else if (Intent.ACTION_SEND_MULTIPLE.equals(action) && type != null && type.startsWith("image/")) {
            ArrayList<Uri> imageUris = inbound.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
            ArrayList<String> out = new ArrayList<>();
            if (imageUris != null) {
                for (Uri u : imageUris) {
                    out.add(u.toString());
                }
            }
            forward.putExtra("share.images", out);
        }

        startActivity(forward);
        finish();
    }
}




// // plugins/sharemenu/ShareMenuActivity.java
// package com.meedan.sharemenu;

// import com.anonymous.realtimechatexpo.MainActivity; // <-- ensure correct package

// import android.app.Activity;
// import android.content.Intent;
// import android.os.Bundle;

// public class ShareMenuActivity extends Activity {
//   @Override
//   protected void onCreate(Bundle savedInstanceState) {
//     super.onCreate(savedInstanceState);

//     Intent main = new Intent(this, MainActivity.class);
//     main.setAction(getIntent().getAction());
//     main.setType(getIntent().getType());
//     main.setData(getIntent().getData());
//     main.putExtras(getIntent());
//     main.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);

//     startActivity(main);
//     finish();
//   }
// }




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