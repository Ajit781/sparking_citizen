import { NativeModules } from 'react-native';
import { API_CONFIG } from '../config/api.config';

const { SecurityModule } = NativeModules;

export const encryptionService = {
  /**
   * Check if encryption is currently active (Production mode)
   */
  isEncryptionEnabled(): boolean {
    return !!(API_CONFIG.ENV.ENABLE_ENCRYPTION || API_CONFIG.ENV.IS_PRODUCTION);
  },

  /**
   * Encrypts payload string using native AES-256-GCM
   * If in Staging / encryption disabled, returns data as-is
   */
  async encrypt(data: string | object): Promise<string> {
    const plainText = typeof data === 'string' ? data : JSON.stringify(data);

    if (!this.isEncryptionEnabled()) {
      return plainText;
    }

    const keyHex = API_CONFIG.ENV.GCM_KEY_HEX;
    if (!keyHex) {
      console.warn('⚠️ [EncryptionService] GCM_KEY_HEX not configured, sending plaintext');
      return plainText;
    }

    if (!SecurityModule || typeof SecurityModule.encryptAESGCM !== 'function') {
      console.warn('⚠️ [EncryptionService] SecurityModule.encryptAESGCM not available on this platform');
      return plainText;
    }

    try {
      const encryptedBase64 = await SecurityModule.encryptAESGCM(plainText, keyHex);
      return encryptedBase64;
    } catch (error) {
      console.error('❌ [EncryptionService] Encryption failed:', error);
      throw error;
    }
  },

  /**
   * Decrypts ciphertext Base64 using native AES-256-GCM
   * If data is plaintext JSON or encryption is disabled, returns ciphertext as-is
   */
  async decrypt(cipherText: string): Promise<string> {
    if (!this.isEncryptionEnabled()) {
      return cipherText;
    }

    // If it's already plaintext JSON (starts with { or [), return as-is
    const trimmed = (cipherText || '').trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      return cipherText;
    }

    const keyHex = API_CONFIG.ENV.GCM_KEY_HEX;
    if (!keyHex) {
      return cipherText;
    }

    if (!SecurityModule || typeof SecurityModule.decryptAESGCM !== 'function') {
      return cipherText;
    }

    try {
      const decryptedPlain = await SecurityModule.decryptAESGCM(cipherText, keyHex);
      return decryptedPlain;
    } catch (error) {
      console.error('❌ [EncryptionService] Decryption failed:', error);
      return cipherText;
    }
  },
};
