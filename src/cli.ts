#!/usr/bin/env node

/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 */

import { Command } from 'commander';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

const program = new Command();

program
  .name('moxygen')
  .version(pkg.version)
  .description('Doxygen XML to Markdown converter')
  .argument('<directory>', 'Doxygen XML directory')
  .option('-o, --output <file>', 'output file, must contain "%s" when using groups or classes')
  .option('-g, --groups', 'output doxygen groups into separate files', false)
  .option('-c, --classes', 'output doxygen classes into separate files', false)
  .option('-p, --pages', 'output doxygen pages into separate files', false)
  .option('-n, --noindex', 'disable generation of the index', false)
  .option('-a, --anchors', 'add anchors to internal links', false)
  .option('-H, --html-anchors', 'add HTML anchors to internal links', false)
  .option('-l, --language <lang>', 'programming language', 'cpp')
  .option('-t, --templates <dir>', 'custom templates directory')
  .option('-s, --source-root <dir>', 'source root used to resolve file-level group membership')
  .option('-f, --frontmatter', 'prepend YAML frontmatter to output files', false)
  .option('-L, --logfile [file]', 'output log messages to file (default: "moxygen.log")')
  .option('-q, --quiet', 'quiet mode', false)
  .action(async (directory: string, opts: Record<string, unknown>) => {
    try {
      await run({
        directory,
        output: opts.output as string | undefined,
        groups: opts.groups as boolean,
        classes: opts.classes as boolean,
        pages: opts.pages as boolean,
        noindex: opts.noindex as boolean,
        anchors: opts.anchors as boolean,
        htmlAnchors: opts.htmlAnchors as boolean,
        language: opts.language as string,
        templates: opts.templates as string | undefined,
        sourceRoot: opts.sourceRoot as string | undefined,
        frontmatter: opts.frontmatter as boolean,
        logfile: opts.logfile as string | boolean | undefined,
        quiet: opts.quiet as boolean,
      });
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
