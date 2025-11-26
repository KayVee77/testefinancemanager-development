import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from 'react-oidc-context';
import App from './App.tsx';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { cognitoAuthConfig, isCognitoConfigured } from './config/cognito';
import { IS_AWS_MODE, USE_DEV_AUTH } from './config/env';
import './index.css';

// Debug logging for auth configuration
console.info('[MAIN] Auth Configuration:', {
  IS_AWS_MODE,
  USE_DEV_AUTH,
  isCognitoConfigured: isCognitoConfigured(),
  userPoolId: import.meta.env.VITE_AWS_COGNITO_USER_POOL_ID || '(not set)',
  clientId: import.meta.env.VITE_AWS_COGNITO_CLIENT_ID || '(not set)',
  devOnlyAuth: import.meta.env.VITE_DEV_ONLY_AUTH,
  useDynamoDB: import.meta.env.VITE_USE_DYNAMODB,
  runtime: import.meta.env.VITE_RUNTIME
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

