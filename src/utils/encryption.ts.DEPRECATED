import CryptoJS from 'crypto-js';

// In production, this should be generated per-user or derived from user credentials
// For now, using a static key for the local development environment
const ENCRYPTION_KEY = 'finance-app-key-v1-local-dev';

/**
 * Encrypts data using AES encryption.
 * 
 * @param data - The data to encrypt (will be stringified)
 * @returns Encrypted string
 */
export const encryptData = (data: any): string => {
  try {
    const jsonString = JSON.stringify(data);
    return CryptoJS.AES.encrypt(jsonString, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Encryption failed:', error);
    throw new Error('Failed to encrypt data');
  }
};

/**
 * Decrypts data that was encrypted with encryptData.
 * 
 * @param encrypted - The encrypted string to decrypt
 * @returns Decrypted and parsed data, or null if decryption fails
 */
export const decryptData = (encrypted: string): any => {
  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    
    if (!decrypted) {
      // Decryption failed - possibly wrong key or corrupted data
      return null;
    }
    
    return JSON.parse(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
};

/**
 * Checks if a string appears to be encrypted (basic heuristic).
 * Used for migration from unencrypted to encrypted storage.
 * 
 * @param value - The string to check
 * @returns true if the string appears to be encrypted
 */
export const isEncrypted = (value: string): boolean => {
  try {
    // Try to parse as JSON - if it works, it's probably not encrypted
    JSON.parse(value);
    return false;
  } catch {
    // If it's not valid JSON and looks like base64, assume it's encrypted
    return value.length > 20 && /^[A-Za-z0-9+/=]+$/.test(value);
  }
};
