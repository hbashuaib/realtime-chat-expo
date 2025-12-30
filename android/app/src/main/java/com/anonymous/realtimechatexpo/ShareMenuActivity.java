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

          Intent forward = new Intent(this, MainActivity.class);
          forward.setAction(incoming.getAction());
          forward.setType(incoming.getType());

          try {
            forward.putExtras(incoming);
          } catch (Exception e) {
            Log.e("BashChatTest", "!!! Failed to putExtras: " + e.getMessage(), e);
          }

          // Defensive mirroring of common extras
          String text = incoming.getStringExtra(Intent.EXTRA_TEXT);
          if (text != null) {
            forward.putExtra(Intent.EXTRA_TEXT, text);
            Log.e("BashChatTest", ">>> Mirrored EXTRA_TEXT: " + text);
          }

          Uri stream = incoming.getParcelableExtra(Intent.EXTRA_STREAM);
          if (stream != null) {
            forward.putExtra(Intent.EXTRA_STREAM, stream);
            Log.e("BashChatTest", ">>> Mirrored EXTRA_STREAM: " + stream);
          }

          ClipData clip = incoming.getClipData();
          if (clip != null) {
            forward.setClipData(clip);
            Log.e("BashChatTest", ">>> ClipData count: " + clip.getItemCount());
          }

          forward.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK 
               | Intent.FLAG_ACTIVITY_CLEAR_TOP 
               | Intent.FLAG_ACTIVITY_SINGLE_TOP);
          forward.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

          Uri data = incoming.getData();
          if (data != null) {
            forward.setData(data);
            Log.e("BashChatTest", ">>> Set data URI: " + data);
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
      