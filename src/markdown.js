/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/
'use strict';

module.exports = {

  link: function (text, href) {
    return '[' + text + '](' + href + ')';
  },

  escape: {
    row: function (text) {
      return text.replace(/\s*\|\s*$/, '');
    },

    /**
     * Escaping for a cell in a table.
     **/
    cell: function (text) {
      return text.replace(/^[\n]+|[\n]+$/g, '') // trim CRLF
        .replace('/\|/g', '\\|')                // escape the pipe
        .replace(/\n/g, '<br/>');               // escape CRLF
    }
  }

};
