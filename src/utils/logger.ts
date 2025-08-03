// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

// Only import winston and Node.js modules if we're not in a browser
let winston: any;
let path: any;
let fs: any;

if (!isBrowser) {
  winston = require('winston');
  path = require('path');
  fs = require('fs').promises;
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

export interface LoggerConfig {
  level: LogLevel;
  logDir: string;
  maxFiles: number;
  maxSize: string;
  enableConsole: boolean;
  enableFile: boolean;
  enableDebug: boolean;
}

class Logger {
  private logger: winston.Logger;
  private config: LoggerConfig;

  constructor(config: LoggerConfig) {
    this.config = config;
    this.initializeLogger();
  }

  private async initializeLogger(): Promise<void> {
    try {
      // In browser environment, only use console logging
      if (isBrowser) {
        this.logger = {
          error: (message: string, meta?: any) => console.error(message, meta),
          warn: (message: string, meta?: any) => console.warn(message, meta),
          info: (message: string, meta?: any) => console.info(message, meta),
          debug: (message: string, meta?: any) => console.debug(message, meta),
          verbose: (message: string, meta?: any) => console.log(message, meta)
        } as any;
        return;
      }

      // Ensure log directory exists
      await fs.mkdir(this.config.logDir, { recursive: true });

      const transports: winston.transport[] = [];

      // Console transport
      if (this.config.enableConsole) {
        transports.push(
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
              winston.format.printf(({ timestamp, level, message, ...meta }) => {
                const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
                return `${timestamp} [${level}]: ${message} ${metaStr}`;
              })
            )
          })
        );
      }

      // File transports
      if (this.config.enableFile) {
        // Main log file
        transports.push(
          new winston.transports.File({
            filename: path.join(this.config.logDir, 'app.log'),
            maxsize: this.parseSize(this.config.maxSize),
            maxFiles: this.config.maxFiles,
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json()
            )
          })
        );

        // Error log file
        transports.push(
          new winston.transports.File({
            filename: path.join(this.config.logDir, 'error.log'),
            level: 'error',
            maxsize: this.parseSize(this.config.maxSize),
            maxFiles: this.config.maxFiles,
            format: winston.format.combine(
              winston.format.timestamp(),
              winston.format.json()
            )
          })
        );

        // Debug log file (if enabled)
        if (this.config.enableDebug) {
          transports.push(
            new winston.transports.File({
              filename: path.join(this.config.logDir, 'debug.log'),
              level: 'debug',
              maxsize: this.parseSize(this.config.maxSize),
              maxFiles: this.config.maxFiles,
              format: winston.format.combine(
                winston.format.timestamp(),
                winston.format.json()
              )
            })
          );
        }
      }

      this.logger = winston.createLogger({
        level: this.config.level,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        ),
        defaultMeta: { service: 'reddit-media-saver' },
        transports
      });

      this.info('Logger initialized successfully', { config: this.config });
    } catch (error) {
      console.error('Failed to initialize logger:', error);
      // Fallback to console logging
      this.logger = {
        error: (message: string, meta?: any) => console.error(message, meta),
        warn: (message: string, meta?: any) => console.warn(message, meta),
        info: (message: string, meta?: any) => console.info(message, meta),
        debug: (message: string, meta?: any) => console.debug(message, meta),
        verbose: (message: string, meta?: any) => console.log(message, meta)
      } as any;
    }
  }

  private parseSize(sizeStr: string): number {
    const units: { [key: string]: number } = {
      'b': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };

    const match = sizeStr.toLowerCase().match(/^(\d+)([kmg]?b)$/);
    if (!match) return 10 * 1024 * 1024; // Default 10MB

    const [, size, unit] = match;
    return parseInt(size) * (units[unit] || 1);
  }

  // Logging methods
  public error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  public warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  public info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  public debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  public verbose(message: string, meta?: any): void {
    this.logger.verbose(message, meta);
  }

  // Specialized logging methods
  public logAuth(action: string, userId?: string, success: boolean = true, meta?: any): void {
    this.info(`Authentication: ${action}`, {
      userId,
      success,
      action,
      ...meta
    });
  }

  public logDownload(contentId: string, status: string, meta?: any): void {
    this.info(`Download: ${status}`, {
      contentId,
      status,
      ...meta
    });
  }

  public logSearch(query: string, filters: any, resultsCount: number, meta?: any): void {
    this.debug('Search performed', {
      query,
      filters,
      resultsCount,
      ...meta
    });
  }

  public logDatabase(operation: string, table: string, meta?: any): void {
    this.debug(`Database: ${operation}`, {
      operation,
      table,
      ...meta
    });
  }

  public logError(error: Error, context?: string, meta?: any): void {
    this.error(`Error${context ? ` in ${context}` : ''}: ${error.message}`, {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      ...meta
    });
  }

  public logPerformance(operation: string, duration: number, meta?: any): void {
    this.debug(`Performance: ${operation}`, {
      operation,
      duration,
      ...meta
    });
  }

  // Debug utilities
  public startTimer(operation: string): () => void {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.logPerformance(operation, duration);
    };
  }

  public logMemoryUsage(): void {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      this.debug('Memory usage', {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
      });
    }
  }

  // Get log files info
  public async getLogFiles(): Promise<Array<{ name: string; size: number; modified: Date }>> {
    try {
      const files = await fs.readdir(this.config.logDir);
      const logFiles = [];

      for (const file of files) {
        if (file.endsWith('.log')) {
          const filePath = path.join(this.config.logDir, file);
          const stats = await fs.stat(filePath);
          logFiles.push({
            name: file,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }

      return logFiles.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    } catch (error) {
      this.error('Failed to get log files', { error });
      return [];
    }
  }

  // Clear old logs
  public async clearOldLogs(daysToKeep: number = 7): Promise<void> {
    try {
      const files = await this.getLogFiles();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      for (const file of files) {
        if (file.modified < cutoffDate) {
          const filePath = path.join(this.config.logDir, file.name);
          await fs.unlink(filePath);
          this.info(`Deleted old log file: ${file.name}`);
        }
      }
    } catch (error) {
      this.error('Failed to clear old logs', { error });
    }
  }

  // Get logger statistics
  public getStats(): { level: string; transports: string[] } {
    return {
      level: this.config.level,
      transports: this.logger.transports.map(t => t.constructor.name)
    };
  }
}

// Create default logger instance
export const logger = new Logger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  logDir: './logs',
  maxFiles: 5,
  maxSize: '10mb',
  enableConsole: true,
  enableFile: true,
  enableDebug: process.env.NODE_ENV === 'development'
});

export default logger; 