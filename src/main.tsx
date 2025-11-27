import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import App from './App.tsx';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { cognitoAuthConfig, isCognitoConfigured } from './config/cognito';
import { APP_ENV, IS_AWS_MODE, USE_DEV_AUTH, validateEnvironment } from './config/env';
import './index.css';

// Validate environment on startup
validateEnvironment();

// Debug logging for auth configuration
console.info('[MAIN] Auth Configuration:', {
  APP_ENV,
  IS_AWS_MODE,
  USE_DEV_AUTH,
  isCognitoConfigured: isCognitoConfigured(),
  userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID || '(not set)',
  clientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID || '(not set)',
});

// Determine if we should use OIDC authentication
const useOidcAuth = IS_AWS_MODE && isCognitoConfigured();
console.info('[MAIN] useOidcAuth:', useOidcAuth);

// Render app with or without OIDC AuthProvider based on environment
const AppWithProviders = () => (
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>
);

createRoot(document.getElementById('root')!).render(
  useOidcAuth ? (
    <AuthProvider {...cognitoAuthConfig}>
      <AppWithProviders />
    </AuthProvider>
  ) : (
    <AppWithProviders />
  )
);

