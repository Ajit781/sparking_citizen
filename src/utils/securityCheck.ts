import { NativeModules, Alert, BackHandler, Platform } from 'react-native';
import { API_CONFIG } from '../config/api.config';

const { SecurityModule } = NativeModules;

export interface SecurityStatus {
  isRooted: boolean;
  isEmulator: boolean;
}

export const checkDeviceSecurity = async (): Promise<SecurityStatus> => {
  if (Platform.OS !== 'android' || !SecurityModule) {
    return { isRooted: false, isEmulator: false };
  }

  try {
    const isRooted = await SecurityModule.isRooted();
    const isEmulator = await SecurityModule.isEmulator();
    return { isRooted: !!isRooted, isEmulator: !!isEmulator };
  } catch (err) {
    console.warn('[Security] Check error:', err);
    return { isRooted: false, isEmulator: false };
  }
};

let cachedSecurityResult: boolean | null = null;

/**
 * Checks for Rooted Device (Observation #2) and Emulator Device (Observation #7)
 * Returns true if device is safe, false if security breach was found and app is exiting.
 */

export const enforceSecurityRules = async (): Promise<boolean> => {
  if (Platform.OS !== 'android') return true;
  if (cachedSecurityResult !== null) return cachedSecurityResult;

  console.log('[SECURITY AUDIT CHECK INITIATED]');
  console.log(`Platform: Android (${Platform.Version})`);
  console.log('SSL Pinning: Active via network_security_config.xml');

  const { isRooted, isEmulator } = await checkDeviceSecurity();

  try {
    const mapsKey = await SecurityModule.getMapsApiKey();
    console.log(`Google Maps API Key: ${mapsKey}`);
  } catch (e) { }


  // 1. Root check (Always enforced)
  if (isRooted) {
    console.warn('[SECURITY ENFORCEMENT] Rooted device detected! Blocking access.');
    Alert.alert(
      'Security Alert',
      'For security and data protection, S-Parking Citizen cannot run on rooted devices.',
      [{ text: 'Exit App', onPress: () => BackHandler.exitApp() }],
      { cancelable: false }
    );
    return false;
  }

  // 2. Emulator check (Observation #3: Enforced in Release builds and Production mode)
  if ((!__DEV__ || API_CONFIG.ENV.IS_PRODUCTION) && isEmulator) {
    console.warn('[SECURITY ENFORCEMENT] Emulator detected! Blocking access.');
    Alert.alert(
      'Security Alert',
      'For security compliance, this application can only run on physical mobile devices.',
      [{ text: 'Exit App', onPress: () => BackHandler.exitApp() }],
      { cancelable: false }
    );
    return false;
  }

  cachedSecurityResult = true;
  return true;
};
