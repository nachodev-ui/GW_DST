import Constants from 'expo-constants';
import { Platform, UIManager } from 'react-native';
import { nativeMapProvider } from './provider';

export function runtimeMapProvider() {
  const expoGo = Constants.executionEnvironment === 'storeClient';
  return nativeMapProvider(
    Platform.OS,
    Constants.expoConfig?.extra?.googleMaps,
    expoGo,
    Platform.OS !== 'ios' || (!expoGo && UIManager.hasViewManagerConfig('RNMapsGoogleMapView')),
  );
}
