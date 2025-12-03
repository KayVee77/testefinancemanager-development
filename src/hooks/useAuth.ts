/**
 * useAuth Hook - Authentication API for Components
 * 
 * This hook combines authStore (state) + authService (business logic)
 * to provide a clean API for components.
 * 
 * Components should use THIS hook, not the store or service directly.
 * 
 * Features:
 * - Manages authentication state
 * - Handles login/register/logout
 * - Auto-initializes on mount
 * - Environment-aware (LOCAL/AWS with Cognito OIDC)
 */

import { useEffect } from 'react';
import { useAuth as useOidcAuth } from 'react-oidc-context';
import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import { LoginCredentials, RegisterData } from '../utils/auth';
import { IS_AWS_MODE } from '../config/env';
import { isCognitoConfigured } from '../config/cognito';

// Check if we should use OIDC auth
const useOidc = IS_AWS_MODE && isCognitoConfigured();
console.info('[useAuth] useOidc:', useOidc, 'IS_AWS_MODE:', IS_AWS_MODE, 'isCognitoConfigured:', isCognitoConfigured());

/**
 * Authentication hook
 * 
 * Provides a unified interface for both LOCAL and AWS (Cognito OIDC) modes.
 * 
 * @returns Auth state and actions
 */
export const useAuth = () => {
  // LOCAL mode store
  const store = useAuthStore();
  
  // AWS mode: Use OIDC auth (only if configured)
  // The hook is called unconditionally to satisfy the rules-of-hooks
  const oidcAuth = useOidcAuthSafe();
  console.info('[useAuth] oidcAuth:', oidcAuth ? 'available' : 'null');
  
  // Sync OIDC user to store when in AWS mode
  useEffect(() => {
    if (useOidc && oidcAuth?.isAuthenticated && oidcAuth?.user) {
      const appUser = authService.convertOidcUserToAppUser(oidcAuth.user);
      store.setUser(appUser);
    } else if (useOidc && !oidcAuth?.isAuthenticated && !oidcAuth?.isLoading) {
      // User logged out from OIDC
      store.logout();
    }
  }, [oidcAuth?.isAuthenticated, oidcAuth?.user, oidcAuth?.isLoading, store]);
  
  // AWS MODE: Return OIDC-based auth
  if (useOidc && oidcAuth) {
    return {
      // State - from OIDC
      user: oidcAuth.isAuthenticated && oidcAuth.user 
        ? authService.convertOidcUserToAppUser(oidcAuth.user)
        : null,
      isAuthenticated: oidcAuth.isAuthenticated,
      isLoading: oidcAuth.isLoading,
      
      // Actions
      login: async () => {
        // Redirect to Cognito login page
        console.info('[useAuth] login() called, calling signinRedirect...');
        console.info('[useAuth] oidcAuth.signinRedirect:', typeof oidcAuth.signinRedirect);
        await oidcAuth.signinRedirect();
        console.info('[useAuth] signinRedirect completed');
      },
      register: async () => {
        // Cognito Hosted UI handles registration
        // Just redirect to login, user can sign up there
        await oidcAuth.signinRedirect();
      },
      logout: async () => {
        await oidcAuth.removeUser();
        await authService.logout(); // Redirect to Cognito logout
      },
      initialize: async () => {
        // OIDC handles this automatically
      },
      
      // Expose OIDC-specific data for AWS mode
      accessToken: oidcAuth.user?.access_token,
      idToken: oidcAuth.user?.id_token,
    };
  }
  
  // LOCAL MODE: Return localStorage-based auth
  return {
    // State
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    
    // Actions
    login: async (credentials: LoginCredentials) => {
      const user = await authService.login(credentials);
      store.setUser(user);
      return user;
    },
    register: async (data: RegisterData) => {
      const user = await authService.register(data);
      store.setUser(user);
      return user;
    },
    logout: async () => {
      try {
        await authService.logout();
        store.logout();
      } catch (error) {
        store.logout();
      }
    },
    initialize: store.initialize,
    
    // LOCAL mode doesn't have tokens
    accessToken: undefined,
    idToken: undefined,
  };
};

/**
 * Safe wrapper for useOidcAuth that returns null if not in OIDC context
 */
function useOidcAuthSafe() {
  try {
    return useOidcAuth();
  } catch {
    // Not in OIDC context
    return null;
  }
}

/*
 * 📝 USAGE EXAMPLE:
 * 
 * function LoginPage() {
 *   const { login, isLoading, isAuthenticated } = useAuth();
 *   
 *   // In AWS mode, login() redirects to Cognito Hosted UI
 *   // In LOCAL mode, login({ email, password }) authenticates locally
 *   
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     if (IS_AWS_MODE) {
 *       await login(); // Redirects to Cognito
 *     } else {
 *       await login({ email, password }); // Local auth
 *     }
 *   };
 * }
 */

/*
 * 🔒 SECURITY NOTES:
 * 
 * LOCAL mode:
 * - Passwords hashed with PBKDF2 in utils/auth.ts
 * - Session stored in localStorage
 * - Development only!
 * 
 * AWS mode (Cognito OIDC):
 * - AWS Cognito handles all authentication
 * - Tokens stored via oidc-client-ts (configurable)
 * - Access token can be used for API authorization
 * - ID token contains user profile info
 */

