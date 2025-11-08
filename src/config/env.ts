/**
 * Centralized Environment Configuration
 * 
 * IMPORTANT: This project uses VITE (not Next.js)
 * - Use import.meta.env.VITE_* (NOT process.env.NEXT_PUBLIC_*)
 * - See: https://vitejs.dev/guide/env-and-mode.html
 * 
 * Environment Modes:
 * - LOCAL TEST: VITE_DEV_ONLY_AUTH=true (localStorage, no AWS)
 * - PROD AWS: VITE_DEV_ONLY_AUTH=false (Cognito, API Gateway, DynamoDB)
 */

/**
 * Current runtime environment
 */
export const IS_AWS_MODE = import.meta.env.VITE_DEV_ONLY_AUTH === 'false';

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
export const ENVIRONMENT = IS_AWS_MODE ? 'production' : 'local';

/**
 * Helper to get full API URL
 */
export const getApiUrl = (path: string): string => {
  if (!IS_AWS_MODE) {
    throw new Error('API calls only available in AWS mode');
  }
  return `${API_BASE_URL}${path}`;
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
