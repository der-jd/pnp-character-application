/**
 * Debug Logger Utility
 * 
 * Provides conditional logging that only outputs in development mode
 * Automatically disabled in production builds
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Debug log - only shows in development
   */
  debug(scope: string, message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.log(`[${scope}] ${message}`, ...args);
    }
  }

  /**
   * Info log - only shows in development
   */
  info(scope: string, message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.info(`[${scope}] ${message}`, ...args);
    }
  }

  /**
   * Warning log - shows in both dev and production
   */
  warn(scope: string, message: string, ...args: unknown[]): void {
    console.warn(`[${scope}] ${message}`, ...args);
  }

  /**
   * Error log - shows in both dev and production
   */
  error(scope: string, message: string, ...args: unknown[]): void {
    console.error(`[${scope}] ${message}`, ...args);
  }

  /**
   * Group logging - only in development
   */
  group(scope: string, label: string, callback: () => void): void {
    if (this.isDevelopment) {
      console.group(`[${scope}] ${label}`);
      callback();
      console.groupEnd();
    }
  }

  /**
   * Table logging - only in development
   */
  table(scope: string, data: unknown): void {
    if (this.isDevelopment) {
      console.log(`[${scope}]`);
      console.table(data);
    }
  }
}

export const logger = new Logger();
