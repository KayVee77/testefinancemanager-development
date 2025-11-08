/**
 * Notification Service (Production-Ready)
 * 
 * Same UI for both environments
 * Different error messages based on error source
 */

import toast, { Toaster } from 'react-hot-toast';
import { ApplicationError, ErrorCode } from '../errors/ApplicationError';

export const notificationService = {
  success: (message: string) => {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
      style: {
        background: '#10B981',
        color: '#fff',
      }
    });
  },
  
  error: (error: string | ApplicationError) => {
    const message = typeof error === 'string' 
      ? error 
      : getErrorMessage(error);
      
    toast.error(message, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#EF4444',
        color: '#fff',
      }
    });
  },
  
  warning: (message: string) => {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
      style: {
        background: '#F59E0B',
        color: '#fff',
      }
    });
  },
  
  loading: (message: string) => {
    return toast.loading(message, {
      position: 'top-right',
    });
  },
  
  dismiss: (toastId: string) => {
    toast.dismiss(toastId);
  },
  
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    }
  ) => {
    return toast.promise(promise, messages, {
      position: 'top-right',
    });
  }
};

/**
 * Get user-friendly error message based on error code
 */
function getErrorMessage(error: ApplicationError): string {
  const messages: Record<ErrorCode, string> = {
    STORAGE_ERROR: 'Nepavyko išsaugoti duomenų. Bandykite dar kartą.',
    STORAGE_QUOTA_EXCEEDED: 'Saugykla pilna. Ištrinkite senus įrašus.',
    STORAGE_UNAVAILABLE: 'Saugykla nepasiekiama. Patikrinkite naršyklės nustatymus.',
    
    AUTH_ERROR: 'Autentifikacijos klaida. Prisijunkite iš naujo.',
    AUTH_TOKEN_EXPIRED: 'Sesija baigėsi. Prisijunkite iš naujo.',
    AUTH_INVALID_CREDENTIALS: 'Neteisingas el. paštas arba slaptažodis.',
    
    API_ERROR: 'Serverio klaida. Bandykite vėliau.',
    API_NETWORK_ERROR: 'Nėra interneto ryšio. Patikrinkite prisijungimą.',
    API_TIMEOUT: 'Užklausa užtruko per ilgai. Bandykite dar kartą.',
    API_RATE_LIMIT: 'Per daug užklausų. Palaukite minutę.',
    
    VALIDATION_ERROR: 'Neteisingi duomenys. Patikrinkite laukus.',
    
    UNKNOWN_ERROR: 'Įvyko nenumatyta klaida. Bandykite dar kartą.'
  };
  
  return messages[error.code] || error.message;
}

// Export Toaster component for App
export { Toaster };
