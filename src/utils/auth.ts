import { User } from '../types/User';
import CryptoJS from 'crypto-js';
import { AuthError, StorageError } from '../errors/ApplicationError';

/**
 * DEV-ONLY AUTHENTICATION
 * 
 * This auth system is for local development only.
 * In production AWS deployment, this will be replaced with AWS Cognito.
 * 
 * To use dev auth, set environment variable:
 * VITE_RUNTIME=local
 * 
 * When set to 'aws' in production, this module will throw an error, forcing AWS Cognito integration.
 */

// Check if we're in local development mode
const IS_LOCAL_MODE = import.meta.env.VITE_RUNTIME === 'local';

if (!IS_LOCAL_MODE && import.meta.env.PROD) {
  throw new Error(
    'DEV authentication is disabled in production mode. ' +
    'For local development, set VITE_RUNTIME=local. ' +
    'For production, set VITE_RUNTIME=aws and integrate AWS Cognito.'
  );
}

console.info('[AUTH] Using dev authentication (local only)');

const USERS_KEY = 'finance_users';
const CURRENT_USER_KEY = 'finance_current_user';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// Generate a random salt for password hashing
const generateSalt = (): string => {
  return CryptoJS.lib.WordArray.random(128/8).toString();
};

// Secure password hashing using PBKDF2
const hashPassword = (password: string, salt: string): string => {
  return CryptoJS.PBKDF2(password, salt, {
    keySize: 256/32,
    iterations: 10000
  }).toString();
};

// Verify password against stored hash
const verifyPassword = (password: string, hash: string, salt: string): boolean => {
  const testHash = hashPassword(password, salt);
  return testHash === hash;
};

// Legacy simple hash function - for migration only
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
};

interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt?: string; // Optional for backward compatibility
  createdAt: string;
}

export const getStoredUsers = (): StoredUser[] => {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    const storageError = new StorageError('Nepavyko užkrauti vartotojų duomenų', error);
    console.error('[STORAGE]', storageError);
    return [];
  }
};

export const saveUser = (userData: RegisterData): User => {
  const users = getStoredUsers();
  
  // Check email uniqueness
  if (emailExists(userData.email)) {
    throw new AuthError('El. paštas jau užregistruotas');
  }
  
  const salt = generateSalt();
  const newUser: StoredUser = {
    id: Date.now().toString(),
    email: userData.email,
    name: userData.name,
    passwordHash: hashPassword(userData.password, salt),
    salt: salt,
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));

  const user: User = {
    id: newUser.id,
    email: newUser.email,
    name: newUser.name,
    createdAt: new Date(newUser.createdAt),
    lastLogin: new Date()
  };

  return user;
};

export const authenticateUser = async (credentials: LoginCredentials): Promise<User | null> => {
  try {
    const users = getStoredUsers();
    const user = users.find(u => u.email === credentials.email);

    if (!user) {
      const authError = new AuthError('Neteisingas el. paštas arba slaptažodis');
      console.error('[AUTH]', authError);
      return null;
    }

    // Check if user has new secure hash with salt
    if (user.salt) {
      const isValid = verifyPassword(credentials.password, user.passwordHash, user.salt);
      if (isValid) {
        const authenticatedUser: User = {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: new Date(user.createdAt),
          lastLogin: new Date()
        };
        return authenticatedUser;
      }
    } else {
      // Legacy support: user has old simple hash
      // Check with old hash method
      if (user.passwordHash === simpleHash(credentials.password)) {
        // Migrate to new secure hash
        const salt = generateSalt();
        user.salt = salt;
        user.passwordHash = hashPassword(credentials.password, salt);
        
        // Update storage with new hash
        const allUsers = users.map(u => u.id === user.id ? user : u);
        localStorage.setItem(USERS_KEY, JSON.stringify(allUsers));
        
        const authenticatedUser: User = {
          id: user.id,
          email: user.email,
          name: user.name,
          createdAt: new Date(user.createdAt),
          lastLogin: new Date()
        };
        return authenticatedUser;
      }
    }

    const authError = new AuthError('Neteisingas el. paštas arba slaptažodis');
    console.error('[AUTH]', authError);
    return null;
  } catch (error) {
    const authError = new AuthError('Autentifikacijos klaida', error);
    console.error('[AUTH]', authError);
    return null;
  }
};

export const getCurrentUser = (): User | null => {
  try {
    const stored = localStorage.getItem(CURRENT_USER_KEY);
    if (!stored) return null;
    
    const userData = JSON.parse(stored);
    return {
      ...userData,
      createdAt: new Date(userData.createdAt),
      lastLogin: new Date(userData.lastLogin)
    };
  } catch (error) {
    const storageError = new StorageError('Nepavyko užkrauti dabartinio vartotojo', error);
    console.error('[STORAGE]', storageError);
    return null;
  }
};

export const setCurrentUser = (user: User): void => {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (error) {
    const storageError = new StorageError('Nepavyko išsaugoti sesijos', error);
    console.error('[STORAGE]', storageError);
    throw storageError;
  }
};

export const logout = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const emailExists = (email: string): boolean => {
  const users = getStoredUsers();
  return users.some(u => u.email === email);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= 6;
};