import type { ExpoConfig } from 'expo/config';
import * as brand from './assets/identity/brand.json';

const config: ExpoConfig = {
  name: 'Gasway',
  slug: 'gasway',
  scheme: 'gasway',
  version: '0.0.0',
  extra: {
    googleMaps: {
      android: Boolean(process.env.GOOGLE_MAPS_ANDROID_API_KEY),
      ios: Boolean(process.env.GOOGLE_MAPS_IOS_API_KEY),
    },
  },
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
  web: {
    bundler: 'metro',
    output: 'single',
    favicon: brand.assets.favicon,
    name: 'Gasway',
    shortName: 'Gasway',
  },
  plugins: [
    './plugins/with-windows-cmake-path-limit.cjs',
    'expo-router',
    'expo-dev-client',
    'expo-font',
    'expo-secure-store',
    'expo-status-bar',
    [
      'expo-image-picker',
      {
        photosPermission: 'Gasway usa la foto que selecciones para registrar tu vehículo.',
        cameraPermission:
          'Gasway usa la cámara para fotografiar tu vehículo y escanear los documentos que decidas adjuntar.',
        microphonePermission: false,
      },
    ],
    [
      'react-native-document-scanner-plugin',
      {
        cameraPermission:
          'Gasway usa la cámara para fotografiar tu vehículo y escanear los documentos que decidas adjuntar.',
      },
    ],
    './plugins/with-document-camera-permission.cjs',
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
        // Driver navigation only: activated explicitly for an assigned delivery.
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
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
