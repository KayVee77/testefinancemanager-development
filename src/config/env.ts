/**
 * Centralized Environment Configuration
 * 
 * IMPORTANT: This project uses VITE (not Next.js)
 * - Use import.meta.env.VITE_* (NOT process.env.NEXT_PUBLIC_*)
 * - See: https://vitejs.dev/guide/env-and-mode.html
 * 
 * Environment Modes (controlled by VITE_APP_ENV):
 * - local      : localStorage + dev auth (no backend needed)
 * - docker     : DynamoDB Local + dev auth (Docker Compose)
 * - production : DynamoDB + Cognito (AWS)
 * 
 * DEPRECATED variables (still supported for backwards compatibility):
 * - VITE_DEV_ONLY_AUTH, VITE_USE_DYNAMODB, VITE_RUNTIME
 */

// ============================================================================
// ENVIRONMENT DETECTION
// ============================================================================

/**
 * Application environment: 'local' | 'docker' | 'production'
 * This single variable controls auth mode and storage backend.
 * 
 * Fallback logic for backwards compatibility:
 * - If VITE_APP_ENV is set, use it directly
 * - Else if VITE_DEV_ONLY_AUTH=false, treat as production
 * - Else if VITE_USE_DYNAMODB=true, treat as docker
 * - Else if VITE_RUNTIME is set, use it
 * - Default to 'local'
 */
function detectAppEnv(): 'local' | 'docker' | 'production' {
  // New unified variable takes precedence
  const appEnv = import.meta.env.VITE_APP_ENV;
  if (appEnv === 'local' || appEnv === 'docker' || appEnv === 'production') {
    return appEnv;
  }
  
  // Backwards compatibility with old variables
  if (import.meta.env.VITE_DEV_ONLY_AUTH === 'false') {
    return 'production';
  }
  if (import.meta.env.VITE_USE_DYNAMODB === 'true') {
    return 'docker';
  }
  if (import.meta.env.VITE_RUNTIME === 'aws') {
    return 'production';
  }
  if (import.meta.env.VITE_RUNTIME === 'local') {
    return 'local';
  }
  
  // Default to local development
  return 'local';
}

/**
 * Current application environment
 */
export const APP_ENV = detectAppEnv();

// ============================================================================
// DERIVED FLAGS
// ============================================================================

/**
 * Use dev auth (true) or AWS Cognito (false)
 * - local: dev auth
 * - docker: dev auth
 * - production: Cognito
 */
export const USE_DEV_AUTH = APP_ENV !== 'production';

/**
 * Use AWS/DynamoDB storage (true) or localStorage (false)
 * - local: localStorage
 * - docker: DynamoDB Local
 * - production: AWS DynamoDB
 */
export const IS_AWS_MODE = APP_ENV !== 'local';

/**
 * Development mode check (Vite build mode)
 */
export const IS_DEV = import.meta.env.MODE === 'development';

// ============================================================================
// AWS CONFIGURATION
// ============================================================================

/**
 * AWS Region (for Cognito, DynamoDB, API Gateway)
 */
export const AWS_REGION = import.meta.env.VITE_AWS_REGION || 'eu-central-1';

/**
 * API base URL for backend calls
 * - local: http://localhost:3001 (dev-server)
 * - docker: /api (nginx proxy)
 * - production: /api (CloudFront proxy) or API Gateway URL
 */
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  import.meta.env.VITE_API_GATEWAY_URL || 
  (APP_ENV === 'local' ? 'http://localhost:3001' : '/api');

/**
 * AWS Cognito configuration (production only)
 */
export const COGNITO_USER_POOL_ID = import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID || '';
export const COGNITO_CLIENT_ID = import.meta.env.VITE_AWS_COGNITO_CLIENT_ID || '';

/**
 * Environment display name (for logging/debugging)
 */
export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT || APP_ENV;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Helper to get full API URL
 */
export const getApiUrl = (path: string): string => {
  const base = API_BASE_URL.endsWith('/') ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${cleanPath}`;
};

/**
 * Validate required environment variables for current mode
 */
export const validateEnvironment = (): void => {
  console.info(`[ENV] APP_ENV=${APP_ENV}, USE_DEV_AUTH=${USE_DEV_AUTH}, IS_AWS_MODE=${IS_AWS_MODE}`);
  
  if (APP_ENV === 'production') {
    const required = [
      'VITE_AWS_COGNITO_USER_POOL_ID',
      'VITE_AWS_COGNITO_CLIENT_ID'
    ];
    
    const missing = required.filter(key => !import.meta.env[key]);
    
    if (missing.length > 0) {
      console.error(
        `Missing required environment variables for production: ${missing.join(', ')}\n` +
        `Please check your .env.production file.`
      );
    }
  }
  
  if (APP_ENV === 'docker' && !API_BASE_URL) {
    console.warn(
      `VITE_API_BASE_URL not set for docker mode. Defaulting to /api`
    );
  }
};

// ============================================================================
// DEBUG LOGGING
// ============================================================================

// Log environment on module load (dev mode only)
if (IS_DEV) {
  console.info('[ENV] Configuration loaded:', {
    APP_ENV,
    USE_DEV_AUTH,
    IS_AWS_MODE,
    API_BASE_URL,
    ENVIRONMENT,
  });
}
