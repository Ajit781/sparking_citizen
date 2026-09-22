import AsyncStorage from '@react-native-async-storage/async-storage';
import {Platform} from 'react-native';

export interface UserSession {
  device_id: string;
  mobile_no: string;
  user_name: string;
  user_role: string;
  otp_verified: boolean;
  user_type_id: number;
  is_registered: boolean;
  login_type_id: number;
  login_user_id: number;
  vehicle_count: number;
  vehicle_owner_id: number;
}

const STORAGE_KEYS = {
  AUTH_TOKEN: '@sparking_auth_token',
  TOKEN_EXPIRES_AT: '@sparking_token_expires_at',
  DEVICE_ID: '@sparking_device_id',
  FCM_TOKEN: '@sparking_fcm_token',
  USER_SESSION: '@sparking_user_session',
  LAST_OTP: '@sparking_last_otp',
};

class StorageService {
  private static instance: StorageService;

  private constructor() {}

  public static getInstance(): StorageService {
    if (!StorageService.instance) {
      StorageService.instance = new StorageService();
    }
    return StorageService.instance;
  }

  // ==================== TOKEN STORAGE ====================

  public async saveToken(token: string, expiresAt: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
      await AsyncStorage.setItem(STORAGE_KEYS.TOKEN_EXPIRES_AT, expiresAt);
      console.log('💾 [Storage] Token and expiry persisted to local DB');
    } catch (error) {
      console.error('❌ [Storage] Error saving token to local DB:', error);
    }
  }

  public async getToken(): Promise<{token: string; expiresAt: string} | null> {
    try {
      const token = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      const expiresAt = await AsyncStorage.getItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);

      if (token && expiresAt) {
        return {token, expiresAt};
      }
      return null;
    } catch (error) {
      console.error('❌ [Storage] Error reading token from local DB:', error);
      return null;
    }
  }

  public async clearToken(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
      await AsyncStorage.removeItem(STORAGE_KEYS.TOKEN_EXPIRES_AT);
      console.log('🗑️ [Storage] Token cleared from local DB');
    } catch (error) {
      console.error('❌ [Storage] Error clearing token from local DB:', error);
    }
  }

  // ==================== DEVICE MODEL & ID STORAGE ====================

  /**
   * Fetches the actual hardware device model (e.g. "POCO 2310FPCA4I", "Pixel 7")
   */
  public getDeviceModel(): string {
    const constants: any = Platform.constants || {};
    const model = constants.Model || constants.model || '';
    const brand = constants.Brand || constants.brand || '';
    const manufacturer = constants.Manufacturer || constants.manufacturer || '';

    if (brand && model) {
      if (model.toLowerCase().includes(brand.toLowerCase())) {
        return model;
      }
      return `${brand} ${model}`;
    }
    return model || manufacturer || Platform.OS;
  }

  /**
   * Returns consistent Device ID from local storage including the Device Model.
   * Format: <DeviceModel>_<RandomSuffix> (e.g. "POCO_2310FPCA4I_a8b9c1")
   * If not present, generates it using device model, persists it, and returns it.
   */
  public async getDeviceId(): Promise<string> {
    try {
      const existingDeviceId = await AsyncStorage.getItem(STORAGE_KEYS.DEVICE_ID);
      // If we already have a device ID stored with model name, reuse it
      if (existingDeviceId && !existingDeviceId.startsWith('dev_')) {
        return existingDeviceId;
      }

      const modelName = this.getDeviceModel();
      const sanitizedModel = modelName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const newDeviceId = `${sanitizedModel}_${randomSuffix}`;

      await AsyncStorage.setItem(STORAGE_KEYS.DEVICE_ID, newDeviceId);
      console.log('📱 [Storage] Device ID created with model:', newDeviceId);
      return newDeviceId;
    } catch (error) {
      console.error('❌ [Storage] Error managing Device ID:', error);
      return `android_${Date.now()}`;
    }
  }

  // ==================== USER SESSION STORAGE ====================

  public async saveUserSession(session: UserSession): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
      console.log('👤 [Storage] User session saved for mobile:', session.mobile_no);
    } catch (error) {
      console.error('❌ [Storage] Error saving user session:', error);
    }
  }

  public async getUserSession(): Promise<UserSession | null> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEYS.USER_SESSION);
      return json ? JSON.parse(json) : null;
    } catch (error) {
      console.error('❌ [Storage] Error reading user session:', error);
      return null;
    }
  }

  public async clearUserSession(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.USER_SESSION);
      await this.clearLastOtp();
      console.log('🚪 [Storage] User session cleared');
    } catch (error) {
      console.error('❌ [Storage] Error clearing user session:', error);
    }
  }

  // ==================== BACKGROUND RE-LOGIN OTP STORAGE ====================
  public async saveLastOtp(otp: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_OTP, otp);
    } catch (error) {
      console.error('❌ [Storage] Error saving last OTP:', error);
    }
  }

  public async getLastOtp(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.LAST_OTP);
    } catch (error) {
      console.error('❌ [Storage] Error reading last OTP:', error);
      return null;
    }
  }

  public async clearLastOtp(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_OTP);
    } catch (error) {
      console.error('❌ [Storage] Error clearing last OTP:', error);
    }
  }
}

export const storageService = StorageService.getInstance();
