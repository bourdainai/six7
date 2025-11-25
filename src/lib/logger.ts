/**
 * Application logger with environment-aware logging
 * - debug: Development only, stripped in production
 * - info: Important operational information
 * - warn: Warning conditions
 * - error: Error conditions (always logged, can integrate with error tracking)
 */

const isDev = import.meta.env.DEV;

export const logger = {
  /**
   * Debug logs - only in development, completely stripped in production
   * Use for verbose logging during development
   */
  debug: (...args: unknown[]) => {
    if (isDev) {
      console.log(...args);
    }
  },
  
  /**
   * Info logs - important operational information
   * Logged in all environments
   */
  info: (...args: unknown[]) => {
    console.info(...args);
  },
  
  /**
   * Warning logs - potentially harmful situations
   * Logged in all environments
   */
  warn: (...args: unknown[]) => {
    console.warn(...args);
  },
  
  /**
   * Error logs - error events
   * Always logged, can integrate with error tracking services
   */
  error: (...args: unknown[]) => {
    console.error(...args);
    // In production, integrate with error tracking service (Sentry, LogRocket, etc.)
  },
};
