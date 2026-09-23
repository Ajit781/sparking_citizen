import { API_CONFIG } from '../config/api.config';
import { tokenManager } from './tokenManager';

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
      let response = await fetch(url, {
        ...restOptions,
        headers: finalHeaders,
        signal: controller.signal,
      });

      // If token expired (401), clear token, fetch a new one and retry once
      if (response.status === 401 && requiresAuth) {
        console.warn('[ApiClient] 401 Unauthorized received, refreshing token and retrying...');
        tokenManager.clearToken();
        const freshToken = await tokenManager.getValidToken();
        finalHeaders.Authorization = `Bearer ${freshToken}`;

        // Silent Background Session Refresh: Re-verify OTP to re-establish backend session
        try {
          const { storageService } = require('./storageService');
          const session = await storageService.getUserSession();
          const lastOtp = await storageService.getLastOtp();

          if (session?.mobile_no && lastOtp) {
            console.log('🔄 [ApiClient] Backend session might be expired. Attempting silent re-login with stored OTP...');

            const silentPayload = {
              enc_data: JSON.stringify({
                mobile_number: session.mobile_no,
                otp: lastOtp,
                device_id: await storageService.getDeviceId(),
                fcm_push_token: API_CONFIG.DEFAULT_FCM_TOKEN,
              }),
            };

            const silentResponse = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.VALIDATE_OTP}`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
              },
              body: JSON.stringify(silentPayload),
            });

            if (silentResponse.ok) {
              console.log('✅ [ApiClient] Silent background re-login successful!');
            } else {
              console.warn('⚠️ [ApiClient] Silent background re-login failed:', silentResponse.status);
            }
          }
        } catch (silentErr) {
          console.error('❌ [ApiClient] Error during silent background re-login:', silentErr);
        }

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

      console.log(`📥 [ApiClient] Response from ${endpoint}:`, data?.status || response.status, data?.message || '');

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
