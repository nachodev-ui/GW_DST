const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withDocumentCameraPermission(config) {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;
    const permissions = (manifest['uses-permission'] ??= []);
    const camera = permissions.find(
      (entry) => entry.$['android:name'] === 'android.permission.CAMERA',
    );
    if (camera) {
      // --no-clean preserves the old ImagePicker cameraPermission:false removal marker.
      if (camera.$['tools:node'] === 'remove') delete camera.$['tools:node'];
    } else {
      permissions.push({ $: { 'android:name': 'android.permission.CAMERA' } });
    }
    return mod;
  });
};
