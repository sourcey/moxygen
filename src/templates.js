/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 **/
'use strict';

var fs = require('fs');
var log = require('winston');
var path = require('path');
var handlebars = require('handlebars');

var doxyparser = require('./parser');
var helpers = require('./helpers');
var markdown = require('./markdown');

module.exports = {

  // Loaded templates
  templates: {},

  // Load templates from the given directory
  load: function (templateDirectory) {
    fs.readdirSync(templateDirectory).forEach(function (filename) {
      var fullname = path.join(templateDirectory, filename);
      var template = handlebars.compile(fs.readFileSync(fullname, 'utf8'), {
        noEscape: true,
        strict: true
      });
      let match = filename.match(/(.*)\.md$/)
      console.log("trying to match ", filename, match)
      this.templates[filename.match(/(.*)\.md$/)[1]] = template;
    }.bind(this));
  },

  render: function (compound) {
    var template;

    switch (compound.kind) {
      case 'namespace':
        if (Object.keys(compound.compounds).length === 1
          && compound.compounds[Object.keys(compound.compounds)[0]].kind == 'namespace') {
          return undefined;
        }
        template = 'namespace';
        break;
      case 'group':
        template = 'group';
        break;
      case 'class':
      case 'struct':
        template = 'class';
        break;
      case 'dir':
        template = 'dir';
        break;
      case 'function':
        template = 'function';
        break;
      default:
        console.log("No template for kind ",compound.kind)
        return undefined;
    }

    log.verbose('Rendering ' + compound.kind + ' ' + compound.fullname);

    return this.templates[template](compound);
  },

  renderArray: function (compounds) {
    return compounds.map(function (compound) {
      return this.render(compound);
    }.bind(this));
  },

  // Register handlebars helpers
  registerHelpers: function (options) {

    // Escape the code for a table cell.
    handlebars.registerHelper('cell', function(code) {
      if (options.groups && code.indexOf('(#') !== -1) {
        code = helpers.replaceGroupReflink(options.output, doxyparser.references, code);
      }
      return code.replace(/\|/g, '\\|').replace(/\n/g, '<br/>');
    });

    // Escape the code for a titles.
    handlebars.registerHelper('title', function(code) {
      if (options.groups && code.indexOf('(#') !== -1) {
        code = helpers.replaceGroupReflink(options.output, doxyparser.references, code);
      }
      return code.replace(/\n/g, '<br/>');
    });

    // Generate an anchor for internal links
    handlebars.registerHelper('anchor', function(name) {
      if (options.anchors) {
        return '{#' + name + '}';
      }
      else {
        return '';
      }
    });
  }
};
