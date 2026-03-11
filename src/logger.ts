/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 */

import { appendFileSync, writeFileSync } from 'node:fs';

export type LogLevel = 'error' | 'warn' | 'info' | 'verbose' | 'debug';

let currentLevel: LogLevel = 'info';
let quiet = false;
let logFile: string | null = null;

const levels: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] <= levels[currentLevel];
}

function formatMessage(level: LogLevel, message: string): string {
  return `${level}: ${message}`;
}

function writeLog(level: LogLevel, message: string): void {
  const formatted = formatMessage(level, message);

  // Write to file (always, regardless of quiet)
  if (logFile) {
    appendFileSync(logFile, formatted + '\n', 'utf8');
  }

  // Write to console (unless quiet)
  if (!quiet) {
    if (level === 'error') {
      console.error(formatted);
    } else if (level === 'warn') {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }
  }
}

export const log = {
  error(message: string): void {
    if (shouldLog('error')) writeLog('error', message);
  },

  warn(message: string): void {
    if (shouldLog('warn')) writeLog('warn', message);
  },

  info(message: string): void {
    if (shouldLog('info')) writeLog('info', message);
  },

  verbose(message: string): void {
    if (shouldLog('verbose')) writeLog('verbose', message);
  },

  debug(message: string): void {
    if (shouldLog('debug')) writeLog('debug', message);
  },

  setLevel(level: LogLevel): void {
    currentLevel = level;
  },

  init(options: { quiet?: boolean; logfile?: string | boolean }): void {
    if (options.quiet) {
      quiet = true;
    }
    if (typeof options.logfile === 'string') {
      logFile = options.logfile;
    } else if (options.logfile === true) {
      logFile = 'moxygen.log';
    }
    // When logging to file or not quiet, enable verbose output
    if (logFile || !quiet) {
      currentLevel = 'verbose';
    }
    // Truncate logfile at start of run
    if (logFile) {
      writeFileSync(logFile, '', 'utf8');
    }
  },
};
