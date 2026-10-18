import type { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'Gasway',
  slug: 'gasway',
  scheme: 'gasway',
  version: '0.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  ios: { bundleIdentifier: 'cl.gasway.mobile', supportsTablet: true },
  android: { package: 'cl.gasway.mobile' },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-secure-store',
    [
      'expo-location',
      {
        locationWhenInUsePermission: 'Gasway usa tu ubicación para coordinar entregas cercanas.',
        isIosBackgroundLocationEnabled: false,
        isAndroidBackgroundLocationEnabled: false,
      },
    ],
    'expo-notifications',
    [
      'react-native-maps',
      {
        ...(process.env.GOOGLE_MAPS_ANDROID_API_KEY
          ? { androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY }
          : {}),
        ...(process.env.GOOGLE_MAPS_IOS_API_KEY
          ? { iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_IOS_API_KEY }
          : {}),
      },
    ],
  ],
};

export default config;
