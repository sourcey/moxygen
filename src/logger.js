/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 * This file added Copyright (c) 2022 Waldemar Villamayor-Venialbo
 *
 * @license MIT
 **/
'use strict';

const winston = require('winston');

// Create the global logger object
let logger = winston.createLogger({
  level : 'info',
});

module.exports = {

  init : function (options, defaultOptions) {
    // Logger transports
    let logfile = null;
    let logterm = null;

    // Create log console transport
    logterm = new winston.transports.Console({
      consoleWarnLevels : [ 'warn', 'debug' ],
      stderrLevels      : [ 'error' ],
      silent            : options.quiet,
      format            : winston.format.simple(),
    });

    logger.add(logterm);

    // User defined log file?
    if (typeof options.logfile != 'undefined') {
      // Use default log file name?
      if (options.logfile === true) {
        options.logfile = defaultOptions.logfile;
      }
      // Create log file transport
      logfile = new winston.transports.File({
        filename : options.logfile,
        level    : 'silly',
      });

      logger.add(logfile);
    }

    // Set the logging level
    if (!options.quiet) {
      this.setLevel('verbose');
    }
  },

  getLogger: function () {
    return logger;
  },

  setLevel: function (level) {
    logger.level = level;
  },
};
