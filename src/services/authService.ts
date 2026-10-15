import { API_CONFIG } from '../config/api.config';
import { apiClient } from './apiClient';
import { storageService, UserSession } from './storageService';
import { tokenManager } from './tokenManager';
import { encryptionService } from './encryptionService';

export interface GenerateOtpResult {
  mobile_no?: string;
  is_registered?: boolean;
  otp_request_id?: number;
  otp_for_gateway?: string;
  expires_in_seconds?: number;
  resend_after_seconds?: number;
  message?: string;
  random_no?: string;
  [key: string]: any;
}

/**
 * Generate a unique 10-digit random number for anti-replay verification
 */
const generateRandomNo = (): string => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

export const authService = {
  /**
   * Pre-loads the authentication token (e.g. during SplashScreen or App launch)
   */
  async initToken(): Promise<string> {
    try {
      const token = await tokenManager.getValidToken();
      console.log('✅ [AuthService] Auth token ready');
      return token;
    } catch (error: any) {
      console.error('❌ [AuthService] Failed to initialize token on launch:', error?.message || error);
      throw error;
    }
  },

  /**
   * Retrieves the current valid token
   */
  async getCurrentToken(): Promise<string> {
    return tokenManager.getValidToken();
  },

  /**
   * Generate OTP for mobile login
   */
  async generateOtp(mobileNumber: string): Promise<GenerateOtpResult> {
    const deviceId = await storageService.getDeviceId();
    const deviceModel = storageService.getDeviceModel();
    const fcmPushToken = API_CONFIG.DEFAULT_FCM_TOKEN;
    const randomNo = generateRandomNo();

    const payload = {
      enc_data: JSON.stringify({
        mobile_number: mobileNumber.trim(),
        device_id: deviceId,
        fcm_push_token: fcmPushToken,
        random_no: randomNo,
      }),
    };

    if (!encryptionService.isEncryptionEnabled()) {
      console.log(`📲 [AuthService] REQUEST GENERATE_OTP PAYLOAD:\n`, JSON.stringify(payload, null, 2));
    }

    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.GENERATE_OTP,
        payload,
        { requiresAuth: false },
      );

      let parsedData: GenerateOtpResult = {};
      if (typeof response.data === 'string') {
        try {
          parsedData = JSON.parse(response.data);
        } catch {
          parsedData = {};
        }
      } else if (response.data) {
        parsedData = response.data;
      }

      if (!encryptionService.isEncryptionEnabled()) {
        console.log(`📥 [AuthService] RESPONSE GENERATE_OTP:\n`, JSON.stringify(response, null, 2));
        console.log(`📦 [AuthService] PARSED GENERATE_OTP DATA:\n`, JSON.stringify(parsedData, null, 2));
      }

      // Verify random_no anti-replay binding
      if (parsedData?.random_no && String(parsedData.random_no) !== String(randomNo)) {
        console.error(' [SecurityAlert] random_no mismatch in generateOtp! Sent:', randomNo, 'Received:', parsedData.random_no);
        throw new Error('Could not authenticate api response.');
      }

      if (!parsedData.message && response.message) {
        parsedData.message = response.message;
      }

      if (!encryptionService.isEncryptionEnabled()) {
        console.log('✅ [AuthService] OTP generated successfully:', parsedData);
      } else {
        console.log('✅ [AuthService] OTP generated successfully');
      }
      return parsedData;
    } catch (error: any) {
      console.error('❌ [AuthService] Error in generateOtp:', error?.message || error);
      throw error;
    }
  },

  /**
   * Validate OTP and establish user session
   */
  async validateOtp(mobileNumber: string, otp: string): Promise<UserSession> {
    const deviceId = await storageService.getDeviceId();
    const deviceModel = storageService.getDeviceModel();
    const fcmPushToken = API_CONFIG.DEFAULT_FCM_TOKEN;
    const randomNo = generateRandomNo();

    const payload = {
      enc_data: JSON.stringify({
        mobile_number: mobileNumber.trim(),
        otp: otp.trim(),
        device_id: deviceId,
        fcm_push_token: fcmPushToken,
        random_no: randomNo,
      }),
    };

    if (!encryptionService.isEncryptionEnabled()) {
      console.log(`🔐 [AuthService] REQUEST VALIDATE_OTP PAYLOAD:\n`, JSON.stringify(payload, null, 2));
    }

    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.VALIDATE_OTP,
        payload,
        { requiresAuth: false },
      );

      let sessionData: UserSession;
      if (typeof response.data === 'string') {
        sessionData = JSON.parse(response.data);
      } else {
        sessionData = response.data;
      }

      if (!encryptionService.isEncryptionEnabled()) {
        console.log(`📥 [AuthService] RESPONSE VALIDATE_OTP:\n`, JSON.stringify(response, null, 2));
        console.log(`📦 [AuthService] PARSED VALIDATE_OTP SESSION DATA:\n`, JSON.stringify(sessionData, null, 2));
      }

      // Verify random_no anti-replay binding
      if ((sessionData as any)?.random_no && String((sessionData as any).random_no) !== String(randomNo)) {
        console.error('⛔ [SecurityAlert] random_no mismatch in validateOtp! Sent:', randomNo, 'Received:', (sessionData as any).random_no);
        throw new Error('Could not authenticate api response.');
      }

      // Verify account binding (Prevents Replay Attacks with mismatched accounts - CWE-384)
      if (sessionData && sessionData.mobile_no && sessionData.mobile_no.trim() !== mobileNumber.trim()) {
        console.error('⛔ [SecurityAlert] Mismatched account verification detected! Expected:', mobileNumber.trim(), 'Received:', sessionData.mobile_no);
        throw new Error('Security Error: Account verification mismatch. Login aborted.');
      }

      // Persist user session to Local DB
      await storageService.saveUserSession(sessionData);

      if (!encryptionService.isEncryptionEnabled()) {
        console.log('🎉 [AuthService] OTP validated and session stored in Local DB:', sessionData);
      } else {
        console.log('🎉 [AuthService] OTP validated successfully');
      }

      // Generate Bearer token upon successful OTP verification
      try {
        console.log('[AuthService] OTP verified successfully! Generating access token from server...');
        await tokenManager.requestNewToken();
        console.log(' [AuthService] Access token successfully generated and cached!');
      } catch (tokenErr) {
        console.warn(' [AuthService] Token generation failed after OTP validation, will retry later:', tokenErr);
      }

      return sessionData;
    } catch (error: any) {
      console.error('❌ [AuthService] Error in validateOtp:', error?.message || error);
      throw error;
    }
  },

  /**
   * Gets stored user session from Local DB
   */
  async getStoredSession(): Promise<UserSession | null> {
    return storageService.getUserSession();
  },

  /**
   * Clears the user session and token on logout
   */
  async logout(): Promise<void> {
    await storageService.clearUserSession();
    await tokenManager.clearToken();
    console.log('👋 [AuthService] Logged out successfully');
  },
};
