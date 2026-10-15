import { API_CONFIG } from '../config/api.config';
import { tokenManager } from './tokenManager';
import { encryptionService } from './encryptionService';

export interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
  timeoutMs?: number;
}

export class ApiClient {
  private static instance: ApiClient;

  private constructor() { }

  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Main request method with automatic token injection and auto-retry on 401
   */
  public async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { requiresAuth = true, timeoutMs = API_CONFIG.TIMEOUT_MS, headers = {}, ...restOptions } = options;

    const url = endpoint.startsWith('http') ? endpoint : `${API_CONFIG.BASE_URL}${endpoint}`;

    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    };

    if (requiresAuth) {
      const token = await tokenManager.getValidToken();
      finalHeaders.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // Auto-encrypt payload enc_data with AES-256-GCM if in Production / Encryption enabled
      let finalBody = restOptions.body;
      const isEncrypted = encryptionService.isEncryptionEnabled();

      if (restOptions.body && isEncrypted) {
        try {
          const parsed = typeof restOptions.body === 'string' ? JSON.parse(restOptions.body) : restOptions.body;
          if (parsed && parsed.enc_data) {
            const encryptedData = await encryptionService.encrypt(parsed.enc_data);
            finalBody = JSON.stringify({
              ...parsed,
              enc_data: encryptedData,
            });
            console.log(`🌐 [ApiClient] [PRODUCTION ENCRYPTED REQUEST] --> ${restOptions.method || 'POST'} ${url}`);
            console.log(`🔒 [ApiClient] [ENCRYPTED ON-THE-WIRE REQUEST BODY]:\n`, finalBody);
          }
        } catch (e) {
          console.warn('⚠️ [ApiClient] Auto-encryption skipped:', e);
        }
      } else {
        console.log(`🌐 [ApiClient] [STAGING REQUEST] --> ${restOptions.method || 'GET'} ${url}`);
        if (finalBody) {
          console.log(`📝 [ApiClient] [STAGING PLAINTEXT REQUEST BODY]:\n`, finalBody);
        }
      }

      let response = await fetch(url, {
        ...restOptions,
        body: finalBody,
        headers: finalHeaders,
        signal: controller.signal,
      });

      // If token expired (401), clear token, fetch a new one and retry once
      if (response.status === 401 && requiresAuth) {
        console.warn('[ApiClient] 401 Unauthorized received, refreshing token and retrying...');
        tokenManager.clearToken();
        const freshToken = await tokenManager.getValidToken();
        finalHeaders.Authorization = `Bearer ${freshToken}`;

        response = await fetch(url, {
          ...restOptions,
          headers: finalHeaders,
          signal: controller.signal,
        });
      }

      clearTimeout(timeoutId);

      const rawText = await response.text();
      let data: any = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        if (rawText.trim().startsWith('<') || rawText.toLowerCase().includes('<html>')) {
          data = { message: `Server error. Please try again later.` };
        } else {
          data = { message: rawText };
        }
      }

      if (isEncrypted) {
        console.log(`📥 [ApiClient] [ENCRYPTED INCOMING RESPONSE] <-- ${url} (HTTP ${response.status}):\n${rawText}`);
        if (data && typeof data.data === 'string') {
          const trimmed = data.data.trim();
          if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            try {
              const decrypted = await encryptionService.decrypt(data.data);
              data.data = decrypted;
            } catch (e) {
              console.warn('⚠️ [ApiClient] Auto-decryption skipped:', e);
            }
          }
        }
      } else {
        console.log(`📥 [ApiClient] [STAGING RESPONSE] <-- ${url} (HTTP ${response.status}):\n${rawText}`);
      }

      console.log(`📊 [ApiClient] Status from ${endpoint}:`, data?.status || response.status, data?.message || '');

      // Anti-Replay: Verify random_no if present in request enc_data
      if (restOptions.body) {
        try {
          const reqBody = typeof restOptions.body === 'string' ? JSON.parse(restOptions.body) : restOptions.body;
          if (reqBody && reqBody.enc_data) {
            const encObj = typeof reqBody.enc_data === 'string' ? JSON.parse(reqBody.enc_data) : reqBody.enc_data;
            if (encObj && encObj.random_no) {
              const reqRandomNo = String(encObj.random_no);
              let respDataObj: any = null;
              if (typeof data?.data === 'string') {
                try { respDataObj = JSON.parse(data.data); } catch {}
              } else if (typeof data?.data === 'object') {
                respDataObj = data.data;
              }
              const respRandomNo = respDataObj?.random_no || data?.random_no;
              if (respRandomNo && String(respRandomNo) !== reqRandomNo) {
                console.error('⛔ [SecurityAlert] random_no mismatch detected! Sent:', reqRandomNo, 'Received:', respRandomNo);
                throw new Error('Could not authenticate api response.');
              }
            }
          }
        } catch (e: any) {
          if (e.message === 'Could not authenticate api response.') {
            throw e;
          }
        }
      }

      // Check for HTTP failure or Backend Application Failure (status !== 'GEN_000' and status !== 'success')
      if (!response.ok || (data?.status && data.status !== 'GEN_000' && data.status !== 'success')) {
        let exactErrorMessage =
          data?.message ||
          data?.error ||
          data?.data?.message ||
          `Request failed. Please try again later.`;
          
        if (typeof exactErrorMessage === 'object') {
          exactErrorMessage = exactErrorMessage.message || exactErrorMessage.details || `Server error. Please try again later.`;
        }
        
        throw new Error(String(exactErrorMessage));
      }

      return data as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error(`❌ [ApiClient] Error in request to ${endpoint}:`, error?.message || error);
      throw error;
    }
  }

  public get<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T = any>(endpoint: string, body?: any, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T = any>(endpoint: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = ApiClient.getInstance();
