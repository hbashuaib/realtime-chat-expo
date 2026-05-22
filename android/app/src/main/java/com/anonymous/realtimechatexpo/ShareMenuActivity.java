package com.anonymous.realtimechatexpo;

      import android.content.Intent;
      import android.os.Bundle;
      import androidx.appcompat.app.AppCompatActivity;
      import android.net.Uri;
      import android.content.ClipData;
      import android.util.Log;
      import com.facebook.react.ReactApplication;
      

      public class ShareMenuActivity extends AppCompatActivity {
        @Override
        protected void onCreate(Bundle savedInstanceState) {
          super.onCreate(savedInstanceState);
          try {
            // Top-level crash capture
            Thread.setDefaultUncaughtExceptionHandler((t, e) -> {
              Log.e("BashChatTest", "!!! Uncaught in ShareMenuActivity: " + e.getMessage(), e);
            });

            android.widget.Toast.makeText(this, "BashChat Share started", android.widget.Toast.LENGTH_SHORT).show();
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

            Log.e("BashChatTest", ">>> Incoming action=" + incoming.getAction() + ", type=" + incoming.getType());

            if (Intent.ACTION_MAIN.equals(incoming.getAction())) {
                Log.e("BashChatTest", ">>> Ignoring ACTION_MAIN relaunch to preserve share intent");
                return;
            }

            try {
                String text = incoming.getStringExtra(Intent.EXTRA_TEXT);
                Uri stream = incoming.getParcelableExtra(Intent.EXTRA_STREAM);
                String mime = incoming.getType();

                if (text != null) {
                    String json = "{\"kind\":\"text\",\"payload\":{\"text\":" + escapeJson(text) + "}}";
                    BashShareQueue.setPending(json);
                    Log.e("BashChatTest", ">>> Queued text payload: " + text);
                } else if (stream != null) {
                    String json = "{\"kind\":\"image\",\"payload\":{\"uri\":" + escapeJson(stream.toString()) + ",\"mime\":" + escapeJson(mime) + "}}";
                    BashShareQueue.setPending(json);
                    Log.e("BashChatTest", ">>> Queued image payload: " + stream);
                }

                // if (text != null) {
                //     String json = "{\"kind\":\"text\",\"payload\":{\"text\":" + escapeJson(text) + "}}";
                //     BashShareQueue.setPending(json);
                //     Log.e("BashChatTest", ">>> Queued text payload: " + text);

                //     // ✅ Immediately emit to JS
                //     com.anonymous.realtimechatexpo.BashShareModule module =
                //         ((ReactApplication) getApplication()).getReactNativeHost()
                //             .getReactInstanceManager()
                //             .getCurrentReactContext()
                //             .getNativeModule(com.anonymous.realtimechatexpo.BashShareModule.class);
                //     if (module != null) {
                //         module.emitPendingShare();
                //     }
                // } else if (stream != null) {
                //     String json = "{\"kind\":\"image\",\"payload\":{\"uri\":" + escapeJson(stream.toString()) + ",\"mime\":" + escapeJson(mime) + "}}";
                //     BashShareQueue.setPending(json);
                //     Log.e("BashChatTest", ">>> Queued image payload: " + stream);

                //     // ✅ Immediately emit to JS
                //     com.anonymous.realtimechatexpo.BashShareModule module =
                //         ((ReactApplication) getApplication()).getReactNativeHost()
                //             .getReactInstanceManager()
                //             .getCurrentReactContext()
                //             .getNativeModule(com.anonymous.realtimechatexpo.BashShareModule.class);
                //     if (module != null) {
                //         module.emitPendingShare();
                //     }
                // }
            } catch (Exception e) {
                Log.e("BashChatTest", "!!! Failed to queue payload: " + e.getMessage(), e);
            }            

            Intent forward = new Intent(this, MainActivity.class);
            forward.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            forward.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            try {
                startActivity(forward);
                Log.e("BashChatTest", ">>> Forwarded intent to MainActivity successfully");
            } catch (Exception e) {
                Log.e("BashChatTest", "!!! Exception while starting MainActivity: " + e.getMessage(), e);
            }

            finish();
        }

        // Utility method to safely escape strings for JSON
        private static String escapeJson(String input) {
            if (input == null) {
                return "\"\""; // return empty JSON string
            }
            String escaped = input
                .replace("\\", "\\\\")   // escape backslashes
                .replace("\"", "\\\"")   // escape quotes
                .replace("\n", "\\n")       // escape newlines
                .replace("\r", "\\r")       // escape carriage returns
                .replace("\t", "\\t");      // escape tabs
            return "\"" + escaped + "\"";  // wrap in quotes for valid JSON
        }
      }
      