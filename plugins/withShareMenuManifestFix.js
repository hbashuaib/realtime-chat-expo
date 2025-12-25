const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withShareMenuManifestFix(config) {
  return withAndroidManifest(config, async (cfg) => {
    const app = cfg.modResults.manifest.application[0];

    // Find your ShareMenuActivity
    const activity = app.activity.find(a => a.$['android:name'].includes('ShareMenuActivity'));
    if (activity) {
      // Replace intent filters with clean set
      activity['intent-filter'] = [
        {
          action: [{ $: { 'android:name': 'android.intent.action.SEND' } }],
          category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
          data: [
            { $: { 'android:mimeType': 'text/plain' } },
            { $: { 'android:mimeType': 'image/*' } },
            { $: { 'android:mimeType': 'audio/*' } },
            { $: { 'android:mimeType': 'video/*' } },
          ],
        },
        {
          action: [{ $: { 'android:name': 'android.intent.action.SEND_MULTIPLE' } }],
          category: [{ $: { 'android:name': 'android.intent.category.DEFAULT' } }],
          data: [
            { $: { 'android:mimeType': 'image/*' } },
            { $: { 'android:mimeType': 'audio/*' } },
            { $: { 'android:mimeType': 'video/*' } },
          ],
        },
      ];
    }

    return cfg;
  });
};