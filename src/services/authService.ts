/**
 * Auth Service - Authentication Business Logic
 * 
 * This service handles all authentication operations with dual-environment support.
 * 
 * LOCAL mode: Uses localStorage-based auth (development)
 * AWS mode: Uses AWS Cognito with OIDC via react-oidc-context
 * 
 * ⚠️ IMPORTANT: In AWS mode, most auth operations are handled by react-oidc-context.
 * This service provides a unified interface and handles LOCAL mode operations.
 * 
 * Pattern: Service contains business logic, store manages state, hook combines both.
 */

import { User } from '../types/User';
import { USE_DEV_AUTH, IS_AWS_MODE } from '../config/env';
import { 
  authenticateUser, 
  saveUser, 
  logout as localLogout,
  LoginCredentials,
  RegisterData
} from '../utils/auth';
import { notificationService } from './notificationService';
import { logger } from '../errors';
import { AuthError } from '../errors/ApplicationError';
import { getTranslation } from '../i18n';
import { translations } from '../i18n';
import { getCognitoLogoutUrl } from '../config/cognito';

/**
 * Auth Service
 * 
 * Handles authentication operations for both LOCAL and AWS environments.
 * 
 * AWS MODE NOTE:
 * In AWS mode, login/register are handled by Cognito Hosted UI via react-oidc-context.
 * Use the useAuth() hook from react-oidc-context for auth.signinRedirect().
 */
export const authService = {
  /**
   * Login user (LOCAL mode only)
   * 
   * In AWS mode, use auth.signinRedirect() from react-oidc-context instead.
   * 
   * @param credentials - Email and password
   * @returns Authenticated user
   * @throws AuthError if login fails
   */
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      if (!USE_DEV_AUTH) {
        // AWS: Use Cognito OIDC flow
        // This should not be called in AWS mode - use auth.signinRedirect() instead
        throw new AuthError(
          'In AWS mode, use auth.signinRedirect() from useAuth() hook'
        );
      } else {
        // LOCAL: Development auth with localStorage
        const user = await authenticateUser(credentials);
        
        if (!user) {
          throw new AuthError(
            'Neteisingas el. paštas arba slaptažodis'
          );
        }
        
        console.log('[AuthService] User logged in:', user.email);
        
        // Get current language from localStorage
        const storedLang = localStorage.getItem('finance_language');
        const currentLang = (storedLang === 'lt' || storedLang === 'en') ? storedLang : 'lt';
        const message = getTranslation(translations[currentLang], 'auth.welcomeBack', { name: user.name });
        
        notificationService.success(message);
        return user;
      }
    } catch (error) {
      // Log error
      await logger.log(error instanceof AuthError ? error : new AuthError(
        'Login failed',
        error as Error
      ));
      
      // Show notification
      if (error instanceof AuthError) {
        notificationService.error(error);
      } else {
        notificationService.error('Prisijungti nepavyko. Bandykite dar kartą.');
      }
      
      throw error;
    }
  },
  
  /**
   * Register new user (LOCAL mode only)
   * 
   * In AWS mode, use Cognito Hosted UI for registration.
   * 
   * @param data - User registration data
   * @returns New user
   * @throws AuthError if registration fails
   */
  async register(data: RegisterData): Promise<User> {
    try {
      if (!USE_DEV_AUTH) {
        // AWS: Use Cognito Hosted UI for registration
        // Cognito handles sign-up, verification email, etc.
        throw new AuthError(
          'In AWS mode, use Cognito Hosted UI for registration'
        );
      } else {
        // LOCAL: Save to localStorage
        const user = await saveUser(data);
        
        console.log('[AuthService] User registered:', user.email);
        notificationService.success(`Sveiki, ${user.name}! Paskyra sukurta.`);
        return user;
      }
    } catch (error) {
      // Log error
      await logger.log(error instanceof AuthError ? error : new AuthError(
        'Registration failed',
        error as Error
      ));
      
      // Show notification
      if (error instanceof AuthError) {
        notificationService.error(error);
      } else {
        notificationService.error('Registracija nepavyko. Bandykite dar kartą.');
      }
      
      throw error;
    }
  },
  
  /**
   * Logout user
   * 
   * Handles logout for both LOCAL and AWS modes.
   */
  async logout(): Promise<void> {
    try {
      if (!USE_DEV_AUTH) {
        // AWS: Redirect to Cognito logout URL
        console.log('[AuthService] Redirecting to Cognito logout...');
        window.location.href = getCognitoLogoutUrl();
        return;
      } else {
        // LOCAL: Clear localStorage session
        localLogout();
        console.log('[AuthService] User logged out');
        notificationService.success('Sėkmingai atsijungėte');
      }
    } catch (error) {
      // Log error (but don't throw - always allow logout)
      await logger.log(error instanceof AuthError ? error : new AuthError(
        'Logout failed',
        error as Error
      ));
      
      // Still show success (user experience)
      notificationService.success('Atsijungėte');
    }
  },

  /**
   * Convert OIDC user profile to app User type
   * 
   * Used in AWS mode to convert the Cognito user profile
   * to our internal User format.
   */
  convertOidcUserToAppUser(oidcUser: { profile: { email?: string; name?: string; sub?: string } }): User {
    return {
      id: oidcUser.profile.sub || '',
      email: oidcUser.profile.email || '',
      name: oidcUser.profile.name || oidcUser.profile.email?.split('@')[0] || 'User',
      passwordHash: '' // Not used in AWS mode
    };
  }
};

/*
 * 📝 USAGE NOTES:
 * 
 * LOCAL MODE (development):
 * Use the useAuth() hook from src/hooks/useAuth.ts
 * 
 * AWS MODE (production with Cognito):
 * Use the useAuth() hook from react-oidc-context for:
 * - auth.signinRedirect() - Start login flow
 * - auth.signoutRedirect() - Start logout flow
 * - auth.user - Current user info
 * - auth.isAuthenticated - Auth status
 * 
 * The app's useAuth hook abstracts this difference.
 */

/*
 * 🔄 ENVIRONMENT BEHAVIOR:
 * 
 * LOCAL mode (VITE_DEV_ONLY_AUTH=true):
 * - login() → authenticateUser() → localStorage
 * - register() → saveUser() → localStorage
 * - logout() → localLogout() → clear localStorage
 * 
 * AWS mode (VITE_DEV_ONLY_AUTH=false):
 * - Login → auth.signinRedirect() → Cognito Hosted UI → callback
 * - Register → Cognito Hosted UI (has sign-up option)
 * - logout() → Redirect to Cognito logout URL
 * - User info comes from OIDC tokens
 */

