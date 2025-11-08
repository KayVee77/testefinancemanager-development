/**
 * Auth Store - Authentication State Management
 * 
 * This store manages authentication state using Zustand.
 * 
 * ⚠️ ARCHITECTURAL DECISION: Manual Persistence (NO persist middleware)
 * 
 * Why we DON'T use Zustand's persist middleware:
 * 1. It would write to localStorage even in AWS mode (breaks environment isolation)
 * 2. We already have environment-aware persistence in utils/auth.ts
 * 3. Manual persistence gives us full control over when/how data is saved
 * 
 * Pattern: Store manages state, auth.ts handles persistence, service handles business logic.
 * 
 * Environment-aware behavior:
 * - LOCAL mode: Persist to localStorage via utils/auth.ts
 * - AWS mode: Session managed by AWS Cognito (no localStorage)
 */

import { create } from 'zustand';
import { User } from '../types/User';
import { IS_AWS_MODE } from '../config/env';
import { 
  getCurrentUser, 
  setCurrentUser as saveCurrentUser, 
  logout as clearCurrentUser 
} from '../utils/auth';

interface AuthState {
  // State
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  logout: () => void;
  initialize: () => Promise<void>;
}

/**
 * Auth Store
 * 
 * This is a "thin store" - it only manages state.
 * Business logic (login, register) lives in authService.ts
 * 
 * Components access this via useAuth() hook (not directly)
 */
export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  isAuthenticated: false,
  isLoading: true,
  
  /**
   * Set current user and persist based on environment
   */
  setUser: (user) => {
    set({
      user,
      isAuthenticated: !!user,
      isLoading: false
    });
    
    // Manual persistence based on environment
    if (!IS_AWS_MODE && user) {
      // LOCAL: Save to localStorage via utils/auth.ts
      saveCurrentUser(user);
    }
    // AWS: Session managed by Cognito, no localStorage needed
  },
  
  /**
   * Logout and clear session
   */
  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false
    });
    
    // Clear session based on environment
    if (!IS_AWS_MODE) {
      clearCurrentUser();
    }
    // AWS: Handled by authService.logout() → Cognito
  },
  
  /**
   * Initialize auth state (load from storage or check Cognito session)
   * 
   * This should be called once on app startup
   */
  initialize: async () => {
    set({ isLoading: true });
    
    try {
      if (IS_AWS_MODE) {
        // AWS: Check Cognito session via authService
        // This will be implemented when AWS is deployed
        // For now, just set to not authenticated
        console.log('[Auth] AWS mode - Cognito session check not yet implemented');
        set({ 
          user: null, 
          isAuthenticated: false, 
          isLoading: false 
        });
      } else {
        // LOCAL: Load from localStorage via utils/auth.ts
        console.log('[Auth] LOCAL mode - loading from localStorage');
        const user = getCurrentUser();
        set({ 
          user, 
          isAuthenticated: !!user, 
          isLoading: false 
        });
        
        if (user) {
          console.log('[Auth] User loaded:', user.email);
        } else {
          console.log('[Auth] No user session found');
        }
      }
    } catch (error) {
      console.error('[Auth] Failed to initialize:', error);
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      });
    }
  }
}));

/**
 * 📝 USAGE NOTES:
 * 
 * DO NOT use this store directly in components!
 * Use the useAuth() hook instead:
 * 
 * ```typescript
 * import { useAuth } from '@/hooks/useAuth';
 * 
 * function MyComponent() {
 *   const { user, isAuthenticated, login, logout } = useAuth();
 *   
 *   if (!isAuthenticated) {
 *     return <LoginForm onSubmit={login} />;
 *   }
 *   
 *   return <div>Welcome, {user.name}!</div>;
 * }
 * ```
 * 
 * The hook combines this store with authService for a clean API.
 */

/**
 * 🔄 ENVIRONMENT BEHAVIOR:
 * 
 * LOCAL mode (VITE_RUNTIME=local):
 * - initialize() → loads from localStorage
 * - setUser() → saves to localStorage
 * - logout() → clears localStorage
 * 
 * AWS mode (VITE_RUNTIME=aws):
 * - initialize() → checks Cognito session (not yet implemented)
 * - setUser() → no localStorage writes (session in Cognito)
 * - logout() → calls Cognito sign-out (via service)
 * 
 * This dual-environment design allows testing locally without AWS infrastructure.
 */
