#!/usr/bin/env node
'use strict';

var log = require('winston');
var program = require('commander');
var assign = require('object-assign');
var pjson = require('../package.json');
var app = require('../index.js');

program.version(pjson.version)
  .usage('[options] <doxygen directory>')
  .option('-o, --output <file>', 'output file (must contain %s when using groups)', String, 'api.md')
  .option('-g, --groups', 'output doxygen groups into separate files', false)
  .option('-c, --classes', 'output doxygen groups into separate files', false)
  .option('-p, --pages', 'output doxygen pages into separate files', false)
  .option('-n, --noindex', 'disable generation of the index (no effect with `groups` option', false)
  .option('-a, --anchors', 'add anchors to internal links', false)
  .option('-h, --html-anchors', 'add html anchors to internal links', false)
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
    output: program.output,
    groups: program.groups,
    pages: program.pages,
    classes: program.classes,
    noindex: program.noindex,
    anchors: program.anchors,
    htmlAnchors: program.htmlAnchors,
    language: program.language,
    templates: program.templates
  }));
}
else {
  program.help();
}
