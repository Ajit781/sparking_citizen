import {API_CONFIG} from '../config/api.config';
import {apiClient} from './apiClient';
import {storageService, UserSession} from './storageService';
import {tokenManager} from './tokenManager';

export interface GenerateOtpResult {
  mobile_no: string;
  is_registered: boolean;
  otp_request_id: number;
  otp_for_gateway?: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
}

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

    const payload = {
      enc_data: JSON.stringify({
        mobile_number: mobileNumber.trim(),
        device_id: deviceId,
        fcm_push_token: fcmPushToken,
      }),
    };

    console.log(`📲 [AuthService] Requesting OTP for ${mobileNumber} on ${deviceModel} (DeviceID: ${deviceId})`);

    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.GENERATE_OTP,
        payload,
        {requiresAuth: false},
      );

      // Backend returns data as JSON string, parse it
      let parsedData: GenerateOtpResult;
      if (typeof response.data === 'string') {
        parsedData = JSON.parse(response.data);
      } else {
        parsedData = response.data;
      }

      console.log('✅ [AuthService] OTP generated successfully:', parsedData);
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

    const payload = {
      enc_data: JSON.stringify({
        mobile_number: mobileNumber.trim(),
        otp: otp.trim(),
        device_id: deviceId,
        fcm_push_token: fcmPushToken,
      }),
    };

    console.log(`🔐 [AuthService] Validating OTP for ${mobileNumber} on ${deviceModel} (DeviceID: ${deviceId})`);

    try {
      const response = await apiClient.post(
        API_CONFIG.ENDPOINTS.VALIDATE_OTP,
        payload,
        {requiresAuth: false},
      );

      // Backend returns data as JSON string, parse it
      let sessionData: UserSession;
      if (typeof response.data === 'string') {
        sessionData = JSON.parse(response.data);
      } else {
        sessionData = response.data;
      }

      // Persist user session to Local DB
      await storageService.saveUserSession(sessionData);
      
      // Store OTP for background silent re-login if session expires
      await storageService.saveLastOtp(otp.trim());

      console.log('🎉 [AuthService] OTP validated and session stored in Local DB:', sessionData);
      
      // Trigger token generation preemptively
      try {
        await tokenManager.requestNewToken();
      } catch (tokenErr) {
        console.warn('⚠️ [AuthService] Token generation failed after OTP validation, will retry later:', tokenErr);
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
