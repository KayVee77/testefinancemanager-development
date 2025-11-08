/**
 * Error handling exports
 */

export {
  ApplicationError,
  StorageError,
  AuthError,
  ApiError,
  ValidationError,
  ErrorCode,
  ErrorSeverity,
  type ErrorContext
} from './ApplicationError';

export { logger } from './ErrorLogger';
