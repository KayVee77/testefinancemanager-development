/**
 * Centralized Environment Configuration
 * 
 * IMPORTANT: This project uses VITE (not Next.js)
 * - Use import.meta.env.VITE_* (NOT process.env.NEXT_PUBLIC_*)
 * - See: https://vitejs.dev/guide/env-and-mode.html
 * 
 * Environment Modes:
 * - LOCAL TEST: VITE_RUNTIME=local (localStorage, no AWS)
 * - PROD AWS: VITE_RUNTIME=aws (Cognito, API Gateway, DynamoDB)
 * 
 * Migration Note: Replaced VITE_DEV_ONLY_AUTH with VITE_RUNTIME for better semantics
 */

/**
 * Runtime environment type
 */
type RuntimeEnvironment = 'local' | 'aws';

/**
 * Get current runtime environment (with fallback)
 */
export const RUNTIME: RuntimeEnvironment = 
  (import.meta.env.VITE_RUNTIME as RuntimeEnvironment) || 'local';

/**
 * Current runtime environment check
 */
export const IS_AWS_MODE = RUNTIME === 'aws';

/**
 * Development mode check (Vite idiom)
 */
export const IS_DEV = import.meta.env.MODE === 'development';

/**
 * AWS Region (for Cognito, API Gateway, etc.)
 */
export const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'eu-north-1';

/**
 * API Gateway base URL (AWS mode only)
 */
export const API_BASE_URL = import.meta.env.VITE_API_GATEWAY_URL || '';

/**
 * AWS Cognito configuration (AWS mode only)
 */
export const COGNITO_USER_POOL_ID = import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID || '';
export const COGNITO_CLIENT_ID = import.meta.env.VITE_AWS_COGNITO_CLIENT_ID || '';

/**
 * Environment display name
 */
export const ENVIRONMENT = RUNTIME;

/**
 * Helper to get full API URL
 */
export const getApiUrl = (path: string): string => {
  if (!IS_AWS_MODE) {
    throw new Error('API calls only available in AWS mode');
  }
  // Remove /api prefix if path starts with it (API_BASE_URL already includes it)
  const cleanPath = path.startsWith('/api') ? path.substring(4) : path;
  return `${API_BASE_URL}${cleanPath}`;
};

/**
 * Validate required environment variables
 */
export const validateEnvironment = (): void => {
  if (IS_AWS_MODE) {
    const required = [
      'VITE_API_GATEWAY_URL',
      'VITE_AWS_COGNITO_USER_POOL_ID',
      'VITE_AWS_COGNITO_CLIENT_ID'
    ];
    
    const missing = required.filter(key => !import.meta.env[key]);
    
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables for AWS mode: ${missing.join(', ')}\n` +
        `Please check your .env file.`
      );
    }
  }
};
