/**
 * AWS Cognito OIDC Configuration
 * 
 * This configuration is used by react-oidc-context to connect to AWS Cognito.
 * 
 * Values come from environment variables set during build:
 * - VITE_AWS_COGNITO_USER_POOL_ID: Cognito User Pool ID (eu-central-1_XXXXXXXX)
 * - VITE_AWS_COGNITO_CLIENT_ID: App Client ID
 * - VITE_AWS_COGNITO_DOMAIN: Cognito domain for hosted UI (optional)
 * - VITE_APP_URL: Your app's URL (for redirect)
 */

import { WebStorageStateStore } from 'oidc-client-ts';

// Get region from User Pool ID (format: eu-central-1_XXXXXXXX)
const userPoolId = import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID || '';
const region = userPoolId.split('_')[0] || import.meta.env.VITE_AWS_REGION || 'eu-central-1';

// Build the Cognito OIDC authority URL
const authority = userPoolId 
  ? `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`
  : '';

// App URL for redirects (defaults to current origin in browser)
const appUrl = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

/**
 * OIDC Configuration for react-oidc-context
 * 
 * This follows the configuration AWS suggests in the Cognito Console
 */
export const cognitoAuthConfig = {
  // Cognito User Pool OIDC endpoint
  authority,
  
  // App Client ID from Cognito
  client_id: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID || '',
  
  // Where to redirect after login
  redirect_uri: `${appUrl}/callback`,
  
  // Where to redirect after logout
  post_logout_redirect_uri: appUrl,
  
  // OAuth response type (authorization code flow)
  response_type: 'code',
  
  // Scopes to request
  scope: 'openid email profile',
  
  // Store tokens in localStorage (persists across browser sessions)
  userStore: new WebStorageStateStore({ store: window.localStorage }),
  
  // Automatically renew tokens before they expire
  automaticSilentRenew: true,
  
  // Load user info from OIDC userinfo endpoint
  loadUserInfo: true,
};

/**
 * Check if Cognito is properly configured
 */
export const isCognitoConfigured = (): boolean => {
  return !!(
    import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID &&
    import.meta.env.VITE_AWS_COGNITO_CLIENT_ID
  );
};

/**
 * Get Cognito Hosted UI logout URL
 * 
 * Used for sign-out redirect when using Cognito Hosted UI
 */
export const getCognitoLogoutUrl = (): string => {
  const domain = import.meta.env.VITE_AWS_COGNITO_DOMAIN;
  const clientId = import.meta.env.VITE_AWS_COGNITO_CLIENT_ID;
  const logoutUri = encodeURIComponent(appUrl);
  
  if (domain) {
    return `${domain}/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
  }
  
  // Fallback: Use Cognito's built-in logout
  return `https://${userPoolId.replace('_', '.')}.auth.${region}.amazoncognito.com/logout?client_id=${clientId}&logout_uri=${logoutUri}`;
};

/**
 * Environment variable reference for .env files:
 * 
 * .env.production:
 * VITE_DEV_ONLY_AUTH=false
 * VITE_AWS_COGNITO_USER_POOL_ID=eu-central-1_kaKX5BNfr
 * VITE_AWS_COGNITO_CLIENT_ID=63k0okn09vas104vcjb71vhgd7
 * VITE_APP_URL=https://d84l1y8p4kdic.cloudfront.net
 * VITE_AWS_COGNITO_DOMAIN=https://eu-central-1kakx5bnfr.auth.eu-central-1.amazoncognito.com
 */
