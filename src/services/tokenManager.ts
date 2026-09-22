import {API_CONFIG} from '../config/api.config';
import {storageService} from './storageService';

export interface TokenResponse {
  version: string;
  status: string;
  message: string;
  data: {
    access_token: string;
    created_at: string;
    expires_at: string;
  };
}

interface CachedToken {
  accessToken: string;
  expiresAtTimestamp: number;
}

class TokenManager {
  private static instance: TokenManager;
  private cachedToken: CachedToken | null = null;
  private pendingTokenPromise: Promise<string> | null = null;

  private constructor() {}

  public static getInstance(): TokenManager {
    if (!TokenManager.instance) {
      TokenManager.instance = new TokenManager();
    }
    return TokenManager.instance;
  }

  /**
   * Returns a valid access token.
   * 1. Checks memory cache first.
   * 2. Checks local DB (AsyncStorage) next.
   * 3. Only if expired or missing, requests a fresh token from the API.
   */
  public async getValidToken(): Promise<string> {
    const now = Date.now();

    // 1. Check in-memory cache
    if (this.cachedToken && this.cachedToken.expiresAtTimestamp > now + 5 * 60 * 1000) {
      const remainingMinutes = Math.round((this.cachedToken.expiresAtTimestamp - now) / 60000);
      console.log(`⚡ [TokenManager] Using in-memory token (Valid for next ${remainingMinutes} mins)`);
      return this.cachedToken.accessToken;
    }

    // 2. Check persistent Local DB (AsyncStorage)
    try {
      const stored = await storageService.getToken();
      if (stored?.token && stored?.expiresAt) {
        const storedExpiry = new Date(stored.expiresAt.replace(' ', 'T')).getTime();
        if (!isNaN(storedExpiry) && storedExpiry > now + 5 * 60 * 1000) {
          const remainingMinutes = Math.round((storedExpiry - now) / 60000);
          console.log(`💾 [TokenManager] Loaded valid token from Local DB (Valid for next ${remainingMinutes} mins)`);
          this.cachedToken = {
            accessToken: stored.token,
            expiresAtTimestamp: storedExpiry,
          };
          return stored.token;
        } else {
          console.log('⌛ [TokenManager] Local DB token has expired. Requesting fresh token...');
        }
      }
    } catch (e) {
      console.warn('⚠️ [TokenManager] Failed to read from local DB, continuing to network:', e);
    }

    // 3. Deduplicate in-flight network requests
    if (this.pendingTokenPromise) {
      console.log('⏳ [TokenManager] Token request already in progress, waiting for existing request...');
      return this.pendingTokenPromise;
    }

    this.pendingTokenPromise = this.requestNewToken();

    try {
      const token = await this.pendingTokenPromise;
      return token;
    } finally {
      this.pendingTokenPromise = null;
    }
  }

  /**
   * Calls the /auth/generate_token endpoint
   */
  public async requestNewToken(): Promise<string> {
    const url = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.GENERATE_TOKEN}`;

    const payload = {
      enc_data: JSON.stringify({
        username: API_CONFIG.AUTH_CREDENTIALS.username,
        password: API_CONFIG.AUTH_CREDENTIALS.password,
      }),
    };

    console.log('═══════════════════════════════════════════════');
    console.log('🔑 [TokenManager] START FETCHING NEW TOKEN');
    console.log('🌐 [TokenManager] URL:', url);
    console.log('📤 [TokenManager] Payload:', JSON.stringify(payload));
    console.log('═══════════════════════════════════════════════');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT_MS);

    try {
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const durationMs = Date.now() - startTime;

      console.log(`📡 [TokenManager] HTTP Response Status: ${response.status} (${durationMs}ms)`);

      const json: TokenResponse = await response.json();
      console.log('📦 [TokenManager] Response Status Code:', json.status);
      console.log('💬 [TokenManager] Response Message:', json.message);

      if (!response.ok || json.status !== 'GEN_000' || !json.data?.access_token) {
        throw new Error(json.message || `Token generation failed with HTTP status ${response.status}`);
      }

      const accessToken = json.data.access_token;
      console.log('🎫 [TokenManager] Access Token:', accessToken);
      console.log('⏰ [TokenManager] Token Created At:', json.data.created_at);
      console.log('⏳ [TokenManager] Token Expires At:', json.data.expires_at);
      console.log('═══════════════════════════════════════════════');

      // Parse expires_at (e.g. "2026-09-16 08:21:10")
      const expiryTimestamp = json.data.expires_at
        ? new Date(json.data.expires_at.replace(' ', 'T')).getTime()
        : Date.now() + 24 * 60 * 60 * 1000;

      this.cachedToken = {
        accessToken,
        expiresAtTimestamp: isNaN(expiryTimestamp) ? Date.now() + 24 * 60 * 60 * 1000 : expiryTimestamp,
      };

      // Persist to Local DB
      await storageService.saveToken(accessToken, json.data.expires_at);

      return accessToken;
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('❌ [TokenManager] ERROR GENERATING TOKEN:');
      console.error('   Details:', error?.message || error);
      console.log('═══════════════════════════════════════════════');
      throw error;
    }
  }

  /**
   * Clears the token from both memory and local DB (e.g. on logout or 401 error)
   */
  public async clearToken(): Promise<void> {
    this.cachedToken = null;
    this.pendingTokenPromise = null;
    await storageService.clearToken();
  }
}

export const tokenManager = TokenManager.getInstance();
