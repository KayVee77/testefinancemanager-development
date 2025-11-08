/**
 * Auth Service - Authentication Business Logic
 * 
 * This service handles all authentication operations with dual-environment support.
 * 
 * ⚠️ ARCHITECTURAL DECISION: Keep userId explicit in all methods
 * 
 * Why explicit userId?
 * - Components need user object anyway (for display, navigation, etc.)
 * - Makes testing easier (no need to mock store)
 * - LOCAL mode needs userId for storage keys
 * - Clearer API - you see exactly what's being passed
 * 
 * Pattern: Service contains business logic, store manages state, hook combines both.
 */

import { User } from '../types/User';
import { IS_AWS_MODE } from '../config/env';
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

/**
 * Auth Service
 * 
 * Handles authentication operations for both LOCAL and AWS environments.
 * Store updates happen in the hooks, not here.
 */
export const authService = {
  /**
   * Login user
   * 
   * @param credentials - Email and password
   * @returns Authenticated user
   * @throws AuthError if login fails
   */
  async login(credentials: LoginCredentials): Promise<User> {
    try {
      if (IS_AWS_MODE) {
        // AWS: Cognito authentication
        // TODO: Implement when AWS is deployed
        // const cognitoUser = await Auth.signIn(credentials.email, credentials.password);
        // const response = await http.get<User>('/users/me');
        // return response;
        throw new AuthError(
          'AWS Cognito not yet implemented'
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
        notificationService.success(`Sveiki sugrįžę, ${user.name}!`);
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
   * Register new user
   * 
   * @param data - User registration data
   * @returns New user
   * @throws AuthError if registration fails
   */
  async register(data: RegisterData): Promise<User> {
    try {
      if (IS_AWS_MODE) {
        // AWS: Cognito sign-up
        // TODO: Implement when AWS is deployed
        // await Auth.signUp({ username: data.email, password: data.password });
        // const response = await http.post<User>('/users', data);
        // return response;
        throw new AuthError(
          'AWS Cognito not yet implemented'
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
   * Note: This only handles the authentication provider logout.
   * Store cleanup happens in the hook.
   */
  async logout(): Promise<void> {
    try {
      if (IS_AWS_MODE) {
        // AWS: Cognito sign-out
        // TODO: Implement when AWS is deployed
        // await Auth.signOut();
        throw new AuthError(
          'AWS Cognito not yet implemented'
        );
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
  }
};

/*
 * 📝 USAGE NOTES:
 * 
 * DO NOT use this service directly in components!
 * Use the useAuth() hook instead:
 * 
 * import { useAuth } from '@/hooks/useAuth';
 * 
 * function LoginForm() {
 *   const { login, isLoading } = useAuth();
 *   
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     await login({ email, password });
 *   };
 * }
 * 
 * The hook combines this service with authStore for state management.
 */

/*
 * 🔄 ENVIRONMENT BEHAVIOR:
 * 
 * LOCAL mode (VITE_RUNTIME=local):
 * - login() → authenticateUser() → localStorage
 * - register() → saveUser() → localStorage
 * - logout() → localLogout() → clear localStorage
 * 
 * AWS mode (VITE_RUNTIME=aws):
 * - login() → AWS Cognito sign-in → JWT tokens
 * - register() → AWS Cognito sign-up → verification email
 * - logout() → AWS Cognito sign-out → clear tokens
 * 
 * This service abstracts the environment differences.
 * Components don't need to know which mode they're in.
 */
