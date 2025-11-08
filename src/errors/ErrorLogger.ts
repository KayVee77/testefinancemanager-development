/**
 * Error Logger (Demo-Grade for Thesis)
 * 
 * LOCAL TEST: Console + localStorage for debugging
 * PROD AWS: CloudWatch Logs via /api/logs endpoint
 * 
 * Demo simplifications:
 * - No X-Ray tracing (x-trace-id header is sufficient)
 * - No complex alerting (optional SNS for critical errors)
 * - 1-day log retention (cost optimization)
 * 
 * Automatically switches based on environment
 */

import { ApplicationError, ErrorSeverity } from './ApplicationError';
import { IS_AWS_MODE, API_BASE_URL } from '../config/env';

const MAX_LOCAL_ERRORS = 100; // Keep last 100 errors in localStorage

interface ErrorLog {
  timestamp: string;
  error: ReturnType<ApplicationError['toJSON']>;
  userAgent: string;
  url: string;
}

class ErrorLogger {
  private readonly storageKey = 'finance_error_logs';
  
  /**
   * Log error to appropriate destination
   */
  async log(error: ApplicationError): Promise<void> {
    const errorLog: ErrorLog = {
      timestamp: new Date().toISOString(),
      error: error.toJSON(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Console logging (both environments)
    this.logToConsole(error);
    
    if (IS_AWS_MODE) {
      // Production: Send to CloudWatch
      await this.logToCloudWatch(errorLog);
    } else {
      // Development: Store in localStorage
      this.logToLocalStorage(errorLog);
    }
    
    // Critical errors: Alert immediately
    if (error.severity === ErrorSeverity.CRITICAL) {
      this.alertCriticalError(error);
    }
  }
  
  /**
   * Console logging with color coding
   */
  private logToConsole(error: ApplicationError): void {
    const style = this.getConsoleStyle(error.severity);
    console.group(`%c${error.severity}: ${error.code}`, style);
    console.error('Message:', error.message);
    console.error('Context:', error.context);
    if (error.originalError) {
      console.error('Original Error:', error.originalError);
    }
    console.error('Stack:', error.stack);
    console.groupEnd();
  }
  
  /**
   * Store errors in localStorage for local debugging
   */
  private logToLocalStorage(errorLog: ErrorLog): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      const logs: ErrorLog[] = stored ? JSON.parse(stored) : [];
      
      // Add new error
      logs.unshift(errorLog);
      
      // Keep only last MAX_LOCAL_ERRORS
      if (logs.length > MAX_LOCAL_ERRORS) {
        logs.splice(MAX_LOCAL_ERRORS);
      }
      
      localStorage.setItem(this.storageKey, JSON.stringify(logs));
    } catch (e) {
      console.error('Failed to log to localStorage:', e);
    }
  }
  
  /**
   * Send errors to AWS CloudWatch (production only)
   * 
   * SECURITY: Never call CloudWatch SDK directly from browser!
   * Always use backend API endpoint with PII scrubbing
   */
  private async logToCloudWatch(errorLog: ErrorLog): Promise<void> {
    if (!IS_AWS_MODE) return;
    
    try {
      // Send to backend /api/logs endpoint (not CloudWatch SDK directly!)
      // Backend will scrub PII and forward to CloudWatch
      const response = await fetch(`${API_BASE_URL}/logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-trace-id': crypto.randomUUID(), // Trace correlation
          // Add Cognito token for authentication
          // 'Authorization': `Bearer ${await getCognitoToken()}`
        },
        body: JSON.stringify({
          ...errorLog,
          // Backend will add server-side context
          clientTimestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        console.error('Failed to send error to backend:', response.statusText);
      }
    } catch (e) {
      // Fallback: don't throw on logging failure
      console.error('Backend logging failed:', e);
    }
  }
  
  /**
   * Alert for critical errors (OPTIONAL for demo)
   */
  private alertCriticalError(error: ApplicationError): void {
    if (IS_AWS_MODE) {
      // Production: Trigger SNS notification via Lambda (OPTIONAL)
      // For demo, this is nice-to-have, not required
      // CloudWatch console viewing is sufficient
      this.sendSNSAlert(error);
    } else {
      // Development: Browser console
      console.error('🚨 CRITICAL ERROR:', error.message);
    }
  }
  
  /**
   * Send SNS alert (AWS only, OPTIONAL for demo)
   */
  private async sendSNSAlert(error: ApplicationError): Promise<void> {
    // OPTIONAL: Only implement if time permits
    // Not critical for thesis demonstration
    try {
      await fetch(`${API_BASE_URL}/alerts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'critical_error',
          error: error.toJSON()
        })
      });
    } catch (e) {
      console.error('Failed to send SNS alert:', e);
      // Not critical if fails - logs are in CloudWatch
    }
  }
  
  /**
   * Get stored error logs (local only)
   */
  getLocalLogs(): ErrorLog[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }
  
  /**
   * Clear local error logs
   */
  clearLocalLogs(): void {
    localStorage.removeItem(this.storageKey);
  }
  
  /**
   * Console style based on severity
   */
  private getConsoleStyle(severity: ErrorSeverity): string {
    const styles = {
      INFO: 'color: blue; font-weight: bold',
      WARNING: 'color: orange; font-weight: bold',
      ERROR: 'color: red; font-weight: bold',
      CRITICAL: 'color: white; background: red; font-weight: bold; padding: 2px 4px'
    };
    return styles[severity];
  }
}

export const logger = new ErrorLogger();
