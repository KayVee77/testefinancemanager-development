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
 * - Environment-aware (LOCAL/AWS)
 */

import { useAuthStore } from '../stores/authStore';
import { authService } from '../services/authService';
import { LoginCredentials, RegisterData } from '../utils/auth';

/**
 * Authentication hook
 * 
 * @returns Auth state and actions
 */
export const useAuth = () => {
  const { user, isAuthenticated, isLoading, setUser, logout: storeLogout, initialize } = useAuthStore();
  
  /**
   * Login user
   * 
   * @param credentials - Email and password
   * @throws Error if login fails
   */
  const login = async (credentials: LoginCredentials) => {
    try {
      const user = await authService.login(credentials);
      setUser(user); // Update store
      return user;
    } catch (error) {
      // Error already logged and notified in service
      throw error;
    }
  };
  
  /**
   * Register new user
   * 
   * @param data - User registration data
   * @throws Error if registration fails
   */
  const register = async (data: RegisterData) => {
    try {
      const user = await authService.register(data);
      setUser(user); // Update store
      return user;
    } catch (error) {
      // Error already logged and notified in service
      throw error;
    }
  };
  
  /**
   * Logout user
   * 
   * Clears both auth provider session and local store.
   */
  const logout = async () => {
    try {
      await authService.logout(); // Clear auth provider (Cognito/localStorage)
      storeLogout(); // Clear store
    } catch (error) {
      // Always allow logout even if service fails
      storeLogout();
    }
  };
  
  return {
    // State
    user,
    isAuthenticated,
    isLoading,
    
    // Actions
    login,
    register,
    logout,
    initialize
  };
};

/*
 * 📝 USAGE EXAMPLE:
 * 
 * function LoginPage() {
 *   const { login, isLoading } = useAuth();
 *   const [email, setEmail] = useState('');
 *   const [password, setPassword] = useState('');
 *   
 *   const handleSubmit = async (e) => {
 *     e.preventDefault();
 *     try {
 *       await login({ email, password });
 *       // User is now authenticated, App.tsx will redirect
 *     } catch (error) {
 *       // Error notification already shown
 *     }
 *   };
 *   
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input 
 *         type="email" 
 *         value={email} 
 *         onChange={(e) => setEmail(e.target.value)} 
 *       />
 *       <input 
 *         type="password" 
 *         value={password} 
 *         onChange={(e) => setPassword(e.target.value)} 
 *       />
 *       <button disabled={isLoading}>
 *         {isLoading ? 'Prisijungiama...' : 'Prisijungti'}
 *       </button>
 *     </form>
 *   );
 * }
 */

/*
 * 🔒 SECURITY NOTES:
 * 
 * - Passwords are never stored in clear text
 * - LOCAL mode: PBKDF2 hashing in utils/auth.ts
 * - AWS mode: AWS Cognito handles all auth security
 * - User object in store does NOT contain password
 * - Session persistence uses environment-specific methods
 */
