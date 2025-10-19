import { User } from '../types/User';

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

// Simple hash function for password storage (for demo purposes)
const simpleHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
};

export const getStoredUsers = (): Array<{ id: string; email: string; name: string; passwordHash: string; createdAt: string }> => {
  try {
    const stored = localStorage.getItem(USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading users:', error);
    return [];
  }
};

export const saveUser = (userData: RegisterData): User => {
  const users = getStoredUsers();
  const newUser = {
    id: Date.now().toString(),
    email: userData.email,
    name: userData.name,
    passwordHash: simpleHash(userData.password),
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

export const authenticateUser = (credentials: LoginCredentials): User | null => {
  const users = getStoredUsers();
  const user = users.find(u => 
    u.email === credentials.email && 
    u.passwordHash === simpleHash(credentials.password)
  );

  if (user) {
    const authenticatedUser: User = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: new Date(user.createdAt),
      lastLogin: new Date()
    };
    return authenticatedUser;
  }

  return null;
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
    console.error('Error loading current user:', error);
    return null;
  }
};

export const setCurrentUser = (user: User): void => {
  try {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } catch (error) {
    console.error('Error saving current user:', error);
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