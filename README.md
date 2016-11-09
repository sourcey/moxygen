# Moxygen

Moxygen is a doxygen XML to markdown converter for developers who want a beautiful and minimal documentation solution for their C++ projects.

The code is based on `doxygen2md` with extra options for generating output files, custom templates, and generating multipage documentation.

Moxygen is currently used in conjunction with GitBook to generate the API documentation for LibSourcey, which can be viewed [here](http://sourcey.com/libsourcey/).

## Usage

1. Add `GENERATE_XML=YES` to your `Doxyfile` first.
2. Run `doxygen` to generate the XML documentation.
3. Install `moxygen` like so: `npm install moxygen -g`.
4. Run `moxygen` providing the folder location of the XML documentation as the first argument ie. `{OUTPUT_DIRECTORY}/xml`.  
  ```
  Usage: moxygen [options] <doxygen directory>

  Options:

    -h, --help             output usage information
    -V, --version          output the version number
    -v, --verbose          verbose mode
    -a, --anchors          add anchors to internal links
    -g, --modules          output doxygen modules into separate files
    -l, --language <lang>  programming language
    -t, --templates <dir>  custom templates directory
    -o, --output <file>    output file (must contain %s when using modules)
  ```

## Multipage Output

Moxygen supports the doxygen [modules](http://www.stack.nl/~dimitri/doxygen/manual/grouping.html#modules) syntax for generating multipage documentation.

Every [\defgroup](http://www.stack.nl/~dimitri/doxygen/manual/commands.html#cmddefgroup) in your source code will be parsed and output into a separate markdown file, with internal reference updated accordingly.

Example:

```
moxygen --anchors --modules --output api-%s.md /path/to/doxygen/xml
```
