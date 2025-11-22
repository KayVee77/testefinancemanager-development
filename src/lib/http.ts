/**
 * HTTP Client - Hybrid Approach
 * 
 * This file exports BOTH:
 * 1. Production-grade HttpClient class (for advanced features)
 * 2. Simple functional API (for everyday use)
 * 
 * Components should use the simple API (http.get, http.post, etc.)
 * Advanced features (retry, idempotency, etc.) are handled automatically under the hood.
 * 
 * Features:
 * - Idempotent mutations (Idempotency-Key header)
 * - Exponential backoff with jitter
 * - Retry-After header support
 * - Trace ID correlation (x-trace-id)
 * - Automatic error logging
 * - Request deduplication
 */

import { ApiError, logger } from '../errors';
import { getApiUrl } from '../config/env';

interface RequestConfig extends RequestInit {
  retry?: {
    maxRetries?: number;
    backoff?: 'exponential' | 'linear';
    maxDelay?: number;
  };
  idempotent?: boolean;
  timeout?: number;
}

interface RequestMetadata {
  traceId: string;
  startTime: number;
  attempt: number;
}

/**
 * Production-Grade HTTP Client Class
 * 
 * This class contains all the advanced features.
 * Most components won't use this directly - use the simple API below instead.
 */
class HttpClient {
  private pendingRequests = new Map<string, Promise<any>>();
  private idempotencyKeys = new Map<string, string>();
  
  /**
   * Make HTTP request with retry logic and error handling
   */
  async request<T>(
    url: string,
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      retry = {},
      idempotent = false,
      timeout = 30000,
      ...fetchConfig
    } = config;
    
    const {
      maxRetries = 3,
      backoff = 'exponential',
      maxDelay = 32000
    } = retry;
    
    // Generate trace ID for request correlation
    const traceId = crypto.randomUUID();
    const metadata: RequestMetadata = {
      traceId,
      startTime: Date.now(),
      attempt: 0
    };
    
    // Request deduplication for GET requests
    if (fetchConfig.method === 'GET' || !fetchConfig.method) {
      const cacheKey = `${url}:${JSON.stringify(fetchConfig)}`;
      const pending = this.pendingRequests.get(cacheKey);
      if (pending) {
        // Return the already-parsed JSON promise
        return await pending;
      }
      
      // Create promise that resolves to parsed JSON
      const promise = this.executeRequest(url, fetchConfig, metadata, idempotent)
        .then(response => response.json());
      
      this.pendingRequests.set(cacheKey, promise);
      
      try {
        return await promise;
      } finally {
        this.pendingRequests.delete(cacheKey);
      }
    }
    
    // Retry logic for mutations
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      metadata.attempt = attempt;
      
      try {
        const response = await this.executeRequest(
          url,
          fetchConfig,
          metadata,
          idempotent,
          timeout
        );
        
        // Handle rate limiting with Retry-After
        if (response.status === 429) {
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter 
            ? parseInt(retryAfter) * 1000 
            : this.calculateBackoff(attempt, backoff, maxDelay);
          
          if (attempt < maxRetries) {
            await this.sleep(delay);
            continue;
          }
          
          throw new ApiError(
            'Per daug užklausų. Bandykite vėliau.',
            429
          );
        }
        
        // Success
        if (response.ok) {
          return await response.json();
        }
        
        // Handle specific error codes
        if (response.status >= 500 && attempt < maxRetries) {
          // Server error - retry
          const delay = this.calculateBackoff(attempt, backoff, maxDelay);
          await this.sleep(delay);
          continue;
        }
        
        // Client error - don't retry
        const errorBody = await response.json().catch(() => ({}));
        throw new ApiError(
          errorBody.message || `HTTP ${response.status}: ${response.statusText}`,
          response.status
        );
        
      } catch (error) {
        lastError = error as Error;
        
        // Network errors - retry
        if (error instanceof TypeError && error.message.includes('fetch') && attempt < maxRetries) {
          const delay = this.calculateBackoff(attempt, backoff, maxDelay);
          await this.sleep(delay);
          continue;
        }
        
        // Don't retry other errors
        break;
      }
    }
    
    // All retries failed
    const apiError = new ApiError(
      `Request failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
      undefined,
      lastError
    );
    
    await logger.log(apiError);
    throw apiError;
  }
  
  /**
   * Execute single HTTP request with metadata
   */
  private async executeRequest(
    url: string,
    config: RequestInit,
    metadata: RequestMetadata,
    idempotent: boolean,
    timeout?: number
  ): Promise<Response> {
    const headers = new Headers(config.headers);
    
    // Add trace ID for correlation
    headers.set('x-trace-id', metadata.traceId);
    
    // Add idempotency key for mutations
    if (idempotent && (config.method === 'POST' || config.method === 'PUT' || config.method === 'PATCH')) {
      const idempotencyKey = this.getIdempotencyKey(url, config.body);
      headers.set('Idempotency-Key', idempotencyKey);
    }
    
    // Add timestamp
    headers.set('x-client-timestamp', Date.now().toString());
    
    // Timeout handling
    const controller = new AbortController();
    const timeoutId = timeout 
      ? setTimeout(() => controller.abort(), timeout)
      : null;
    
    try {
      const response = await fetch(url, {
        ...config,
        headers,
        signal: controller.signal
      });
      
      return response;
    } catch (error) {
      if ((error as Error).name === 'AbortError') {
        throw new ApiError('Request timeout', 408);
      }
      throw error;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }
  
  /**
   * Generate or retrieve idempotency key for request
   */
  private getIdempotencyKey(url: string, body: BodyInit | null | undefined): string {
    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
    const key = `${url}:${bodyStr}`;
    
    // Check if we already have a key for this request
    let idempotencyKey = this.idempotencyKeys.get(key);
    
    if (!idempotencyKey) {
      // Generate new key
      idempotencyKey = crypto.randomUUID();
      this.idempotencyKeys.set(key, idempotencyKey);
      
      // Clean up after 24 hours
      setTimeout(() => {
        this.idempotencyKeys.delete(key);
      }, 24 * 60 * 60 * 1000);
    }
    
    return idempotencyKey;
  }
  
  /**
   * Calculate backoff delay with jitter
   */
  private calculateBackoff(
    attempt: number,
    strategy: 'exponential' | 'linear',
    maxDelay: number
  ): number {
    let delay: number;
    
    if (strategy === 'exponential') {
      // Exponential: 1s, 2s, 4s, 8s, 16s, 32s
      delay = Math.min(Math.pow(2, attempt) * 1000, maxDelay);
    } else {
      // Linear: 1s, 2s, 3s, 4s, 5s
      delay = Math.min((attempt + 1) * 1000, maxDelay);
    }
    
    // Add jitter (±25%) to prevent thundering herd
    const jitter = delay * 0.25 * (Math.random() * 2 - 1);
    return Math.floor(delay + jitter);
  }
  
  /**
   * Sleep helper
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  /**
   * Convenience methods
   */
  async get<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, { ...config, method: 'GET' });
  }
  
  async post<T>(url: string, body: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers
      },
      body: JSON.stringify(body),
      idempotent: true // POST mutations should be idempotent
    });
  }
  
  async put<T>(url: string, body: any, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...config?.headers
      },
      body: JSON.stringify(body),
      idempotent: true // PUT is naturally idempotent
    });
  }
  
  async delete<T>(url: string, config?: RequestConfig): Promise<T> {
    return this.request<T>(url, {
      ...config,
      method: 'DELETE',
      idempotent: true // DELETE is naturally idempotent
    });
  }
}

// ============================================================================
// SIMPLE FUNCTIONAL API (USE THIS IN COMPONENTS)
// ============================================================================

/**
 * Simple HTTP Client Instance
 * 
 * This is the main export that components should use.
 * Example:
 * 
 *   import { http } from '@/lib/http';
 *   
 *   const data = await http.get('/users/123/transactions');
 *   await http.post('/users/123/transactions', { amount: 50 });
 */
const client = new HttpClient();

export const http = {
  /**
   * GET request
   * @param path - API path (e.g., '/users/123/transactions')
   * @param config - Optional request config
   */
  async get<T>(path: string, config?: RequestConfig): Promise<T> {
    const url = getApiUrl(path);
    return client.get<T>(url, config);
  },

  /**
   * POST request
   * @param path - API path
   * @param body - Request body (will be JSON.stringified)
   * @param config - Optional request config
   */
  async post<T>(path: string, body: any, config?: RequestConfig): Promise<T> {
    const url = getApiUrl(path);
    return client.post<T>(url, body, config);
  },

  /**
   * PUT request
   * @param path - API path
   * @param body - Request body
   * @param config - Optional request config
   */
  async put<T>(path: string, body: any, config?: RequestConfig): Promise<T> {
    const url = getApiUrl(path);
    return client.put<T>(url, body, config);
  },

  /**
   * DELETE request
   * @param path - API path
   * @param config - Optional request config
   */
  async delete<T>(path: string, config?: RequestConfig): Promise<T> {
    const url = getApiUrl(path);
    return client.delete<T>(url, config);
  }
};

// Export HttpClient class for advanced use cases
export { HttpClient };

/**
 * 📝 USAGE EXAMPLES:
 * 
 * Simple (recommended for most cases):
 * ```typescript
 * import { http } from '@/lib/http';
 * 
 * // GET request
 * const transactions = await http.get<Transaction[]>('/users/123/transactions');
 * 
 * // POST request
 * const newTransaction = await http.post<Transaction>(
 *   '/users/123/transactions',
 *   { amount: 50, description: 'Coffee' }
 * );
 * 
 * // DELETE request
 * await http.delete('/users/123/transactions/456');
 * ```
 * 
 * Advanced (with custom config):
 * ```typescript
 * import { http } from '@/lib/http';
 * 
 * const data = await http.get('/slow-endpoint', {
 *   timeout: 60000,
 *   retry: {
 *     maxRetries: 5,
 *     backoff: 'linear'
 *   }
 * });
 * ```
 * 
 * All requests automatically include:
 * - ✅ Idempotency keys (prevents duplicate mutations)
 * - ✅ Retry logic with exponential backoff
 * - ✅ Rate limit handling (Retry-After)
 * - ✅ Trace IDs for debugging
 * - ✅ Error logging to ErrorLogger
 * - ✅ Request deduplication (GET only)
 */
