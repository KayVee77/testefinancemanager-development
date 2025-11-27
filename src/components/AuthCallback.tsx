/**
 * OAuth Callback Page
 * 
 * This page handles the redirect from Cognito after login.
 * The react-oidc-context library handles the token exchange automatically.
 * 
 * URL: /callback
 */

import { useEffect } from 'react';
import { useAuth } from 'react-oidc-context';
import { LoadingSpinner } from './LoadingSpinner';

export function AuthCallback() {
  const auth = useAuth();

  useEffect(() => {
    // If authentication is complete, redirect to home
    if (auth.isAuthenticated && !auth.isLoading) {
      // Small delay to ensure tokens are stored
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    }
  }, [auth.isAuthenticated, auth.isLoading]);

  // Show error if authentication failed
  if (auth.error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8">
          <div className="text-red-600 dark:text-red-400 text-xl mb-4">
            Prisijungimo klaida
          </div>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {auth.error.message}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Grįžti į pradžią
          </button>
        </div>
      </div>
    );
  }

  // Show loading while processing OAuth callback
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-gray-600 dark:text-gray-400">
          Prisijungiama...
        </p>
      </div>
    </div>
  );
}

export default AuthCallback;
