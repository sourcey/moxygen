# Moxygen

[![CI](https://github.com/sourcey/moxygen/actions/workflows/ci.yml/badge.svg)](https://github.com/sourcey/moxygen/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/moxygen)](https://www.npmjs.com/package/moxygen)
[![Node](https://img.shields.io/node/v/moxygen)](https://nodejs.org)
[![License](https://img.shields.io/npm/l/moxygen)](https://github.com/sourcey/moxygen/blob/master/LICENCE)

Doxygen XML to Markdown converter for C++ and Java developers who want minimal, beautiful API documentation.

## Features

- **Multi-language** - C++ and Java supported out of the box
- **Multi-page output** - single file, per-group, per-class, or per-page
- **Internal linking** - anchors in comments and function definitions
- **Markdown comments** - Markdown in Doxygen comments is rendered
- **Doxygen groups** - [grouping](http://www.doxygen.nl/manual/grouping.html) support for organised docs
- **Custom templates** - modify the Handlebars templates to suit your needs
- **Optional index** - optionally render a top-level index

## Install

```
npm install moxygen -g
```

Requires Node.js 20+.

## Usage

1. Add `GENERATE_XML=YES` to your `Doxyfile`
2. Run `doxygen` to generate the XML documentation
3. Run `moxygen` pointing to the XML output directory

```
moxygen [options] <doxygen XML directory>

Options:
  -V, --version          output the version number
  -o, --output <file>    output file, must contain "%s" when using groups or classes
  -g, --groups           output doxygen groups into separate files
  -c, --classes          output doxygen classes into separate files
  -p, --pages            output doxygen pages into separate files
  -n, --noindex          disable generation of the index
  -a, --anchors          add anchors to internal links
  -H, --html-anchors     add HTML anchors to internal links
  -l, --language <lang>  programming language (default: cpp)
  -t, --templates <dir>  custom templates directory
  -L, --logfile [file]   output log messages to file (default: moxygen.log)
  -q, --quiet            quiet mode
  -h, --help             display help
```

## Examples

Single file output:
```
moxygen --anchors /path/to/doxygen/xml
```

Multi-file grouped output:
```
moxygen --anchors --groups --output api-%s.md /path/to/doxygen/xml
```

Per-class files:
```
moxygen --classes --output api-%s.md /path/to/doxygen/xml
```

Java project:
```
moxygen --language java --anchors /path/to/doxygen/xml
```

## Custom Templates

Moxygen uses Handlebars templates for output. The default modern templates produce clean Markdown with code-block signatures and parameter tables.

To use the classic (pre-1.0) template style:
```
moxygen --templates ./templates/classic /path/to/xml
```

To create your own templates, copy the `templates/cpp/` directory and modify. Templates receive the full parsed compound data including structured parameter info, inheritance, and more.

## Programmatic API

```typescript
import { run } from 'moxygen';

await run({
  directory: '/path/to/doxygen/xml',
  output: 'api.md',
  anchors: true,
});
```

## Development

```bash
npm install
npm run build
npm test
```

To test against the example:
```bash
npm run example
```

## More Information

For more details, visit [sourcey.com/code/moxygen](https://sourcey.com/code/moxygen).

## Licence

MIT
