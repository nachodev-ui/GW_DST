import type { ExpoConfig } from 'expo/config';
import * as brand from './assets/identity/brand.json';

const config: ExpoConfig = {
  name: 'Gasway',
  slug: 'gasway',
  scheme: 'gasway',
  version: '0.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: brand.assets.icon,
  backgroundColor: brand.colors.cream,
  ios: { bundleIdentifier: 'cl.gasway.mobile', supportsTablet: true },
  android: {
    package: 'cl.gasway.mobile',
    adaptiveIcon: {
      foregroundImage: brand.assets.adaptiveForeground,
      monochromeImage: brand.assets.adaptiveMonochrome,
      backgroundColor: brand.colors.green,
    },
  },
  web: { bundler: 'metro', favicon: brand.assets.favicon, name: 'Gasway', shortName: 'Gasway' },
  plugins: [
    'expo-router',
    'expo-dev-client',
    'expo-secure-store',
    'expo-status-bar',
    [
      'expo-splash-screen',
      {
        image: brand.assets.splashLight,
        imageWidth: brand.splash.imageWidth,
        resizeMode: 'contain',
        backgroundColor: brand.colors.cream,
        dark: { image: brand.assets.splashDark, backgroundColor: brand.colors.green },
      },
    ],
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
