# Moxygen

Moxygen is a doxygen XML to markdown converter that fills the need for developers who have been craving a beautiful and minimal documentation alternative for their C++ projects.

The code is a heavily modified port of `doxygen2md` with a focus on generating multi page documentation from doxygen [modules](http://www.stack.nl/~dimitri/doxygen/manual/grouping.html#modules).

Moxygen is the API documentation generator used by LibSourcey, the result of which can be seen [here](http://sourcey.com/libsourcey/).

## Usage

1. Run `doxygen` to generate the XML documentation.
2. Run `moxygen` providing the folder location of the XML documentation.  

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
