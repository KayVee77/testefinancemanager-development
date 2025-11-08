/**
 * Application Error Classes (Production-Ready)
 * 
 * LOCAL TEST: Logs to console + localStorage
 * PROD AWS: Logs to CloudWatch + X-Ray
 * 
 * Design: Environment-agnostic error structure
 */

import { ENVIRONMENT } from '../config/env';

export enum ErrorCode {
  // Storage errors (localStorage or DynamoDB)
  STORAGE_ERROR = 'STORAGE_ERROR',
  STORAGE_QUOTA_EXCEEDED = 'STORAGE_QUOTA_EXCEEDED',
  STORAGE_UNAVAILABLE = 'STORAGE_UNAVAILABLE',
  
  // Authentication errors (Dev auth or Cognito)
  AUTH_ERROR = 'AUTH_ERROR',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',
  
  // API errors (AWS only)
  API_ERROR = 'API_ERROR',
  API_NETWORK_ERROR = 'API_NETWORK_ERROR',
  API_TIMEOUT = 'API_TIMEOUT',
  API_RATE_LIMIT = 'API_RATE_LIMIT',
  
  // Validation errors (both environments)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  
  // Unknown errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export enum ErrorSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL'
}

export interface ErrorContext {
  userId?: string;
  component?: string;
  action?: string;
  timestamp: string;
  environment: 'local' | 'production';
  metadata?: Record<string, any>;
}

export class ApplicationError extends Error {
  public readonly context: ErrorContext;
  
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly severity: ErrorSeverity = ErrorSeverity.ERROR,
    public readonly originalError?: unknown,
    additionalContext?: Partial<ErrorContext>
  ) {
    super(message);
    this.name = 'ApplicationError';
    
    this.context = {
      timestamp: new Date().toISOString(),
      environment: ENVIRONMENT,
      ...additionalContext
    };
    
    // Maintain proper stack trace
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, ApplicationError);
    }
  }
  
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      severity: this.severity,
      context: this.context,
      stack: this.stack
    };
  }
}

// Specific error types for better handling
export class StorageError extends ApplicationError {
  constructor(message: string, originalError?: unknown) {
    super(ErrorCode.STORAGE_ERROR, message, ErrorSeverity.ERROR, originalError);
  }
}

export class AuthError extends ApplicationError {
  constructor(message: string, originalError?: unknown) {
    super(ErrorCode.AUTH_ERROR, message, ErrorSeverity.WARNING, originalError);
  }
}

export class ApiError extends ApplicationError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    originalError?: unknown
  ) {
    super(ErrorCode.API_ERROR, message, ErrorSeverity.ERROR, originalError);
  }
}

export class ValidationError extends ApplicationError {
  constructor(
    message: string,
    public readonly field?: string,
    originalError?: unknown
  ) {
    super(ErrorCode.VALIDATION_ERROR, message, ErrorSeverity.WARNING, originalError);
  }
}
