/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/
'use strict';

var fs = require('fs');
var path = require('path');
var util = require('util');
var log = require('winston');
var handlebars = require('handlebars');

module.exports = {

  inline: function(code) {
    if (Array.isArray(code)) {
      var refs, s = '', isInline = false;
      code.forEach(function (e) {
        refs = e.split(/(\[.*\]\(.*\)|\n|\s{2}\n)/g);
        refs.forEach(function (f) {
          if (f.charAt(0) == '[') {
            // link
            var link = f.match(/\[(.*)\]\((.*)\)/);
            isInline ? (s += '`') && (isInline = false) : null;
            s += '[`' + link[1] + '`](' + link[2] + ')';
          }
          else if (f == '\n' || f == '  \n') {
            // line break
            isInline ? (s += '`') && (isInline = false) : null;
            s += f;
          }
          else if (f) {
            !isInline ? (s += '`') && (isInline = true) : null;
            s += f;
          }
        });
      });
      return s + (isInline ? '`' : '');
    }
    else {
      return '`' + code + '`';
    }
  },

  // Replace group links to point to correct output file
  replaceGroupReflink: function (outfile, references, str) {
    var match = str.match(/\((#(.*))\)/),
      anchor = match[1],
      refid = match[2],
      ref = references[refid];
    if (ref && ref.groupname) {
      var href = util.format(outfile, ref.groupname) + anchor;
      str = str.replace(/\((#(.*))\)/, '(' + href + ')')
    }
    return str;
  },

  // Write the output file
  writeFile: function (filepath, contents) {
    log.verbose('Writing', filepath);
    var stream = fs.createWriteStream(filepath);
    stream.once('open', function(fd) {
      contents.forEach(function (content) {
        if (content)
          stream.write(content);
      });
      stream.end();
    });
  }
};
