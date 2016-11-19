#!/usr/bin/env node
'use strict';

var log = require('winston');
var program = require('commander');
var assign = require('object-assign');
var pjson = require('../package.json');
var app = require('../index.js');

program.version(pjson.version)
  .usage('[options] <doxygen directory>')
  .option('-a, --anchors', 'add anchors to internal links', false)
  .option('-g, --groups', 'output doxygen groups into separate files', false)
  .option('-o, --output <file>', 'output file (must contain %s when using groups)', String, 'api.md')
  .option('-l, --language <lang>', 'programming language', String, 'cpp')
  .option('-t, --templates <dir>', 'custom templates directory', String, 'templates')
  .option('-q, --quiet', 'quiet mode', false)
  .parse(process.argv);

if (!program.quiet) {
  log.level = 'verbose';
}

if (program.args.length) {
  app.run(assign({}, app.defaultOptions, {
    directory: program.args[0],
    anchors: program.anchors,
    groups: program.groups,
    language: program.language,
    templates: program.templates,
    output: program.output
  }));
}
else {
  program.help();
}
