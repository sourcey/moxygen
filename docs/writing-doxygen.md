---
title: Writing Doxygen
description: Doxygen comments and settings that render cleanly with Moxygen
---

# Writing Doxygen

Moxygen works best when Doxygen is used as the parser, not as the final renderer. Write normal Doxygen comments, generate XML, then let Moxygen turn that XML into Markdown your docs site can own.

This page describes the Doxygen input patterns that produce good Moxygen output.

## Doxyfile settings

Start with XML output enabled:

```ini
GENERATE_XML = YES
XML_OUTPUT = xml
XML_PROGRAMLISTING = YES
MARKDOWN_SUPPORT = YES
```

`XML_PROGRAMLISTING` lets Doxygen include source listings in the XML. Moxygen renders those as fenced code blocks and uses the filename extension as the fence language when Doxygen provides one.

If you want private members in the generated Markdown, Doxygen must emit them first:

```ini
EXTRACT_PRIVATE = YES
```

For grouped output, keep the XML directory and source tree relationship clear. If Doxygen emits sparse group XML for file-level `@addtogroup` blocks or `@file` comments with `@ingroup`, pass `--source-root` so Moxygen can inspect the source comments that Doxygen left out of the group compound XML.

```bash
moxygen --groups \
  --source-root /path/to/project/src \
  --output api-%s.md \
  /path/to/doxygen/xml
```

## Classes and members

Use `@brief` for the summary row, then write normal paragraphs for the member body. `@param` entries become a parameter table when they include descriptions.

```cpp
/// HTTP client used by the runtime.
///
/// Client owns the connection pool and retries transient network errors.
class Client {
public:
  /// Opens a session.
  ///
  /// The session stays valid until it is closed or the client is destroyed.
  ///
  /// @param url Remote endpoint URL.
  /// @param timeoutMs Connect timeout in milliseconds.
  /// @return true when the session was opened.
  /// @warning This call may block while DNS resolves.
  bool open(std::string_view url, int timeoutMs);
};
```

Moxygen uses this data in two places:

- Summary tables use `@brief` or the first useful sentence.
- Member pages include the signature, body text, parameter table, return section, and warning or note blocks.

## Pages

Doxygen pages are useful for guides, build instructions, and conceptual docs that should live beside API reference.

```cpp
/**
 * @page build Build
 *
 * # Build
 *
 * ## Linux
 *
 * ```bash
 * cmake -S . -B build
 * cmake --build build
 * ```
 *
 * @anchor build-options
 *
 * Options:
 *
 * - `BUILD_TESTING`
 * - `CMAKE_BUILD_TYPE`
 */
```

Run with `--pages` to write page output:

```bash
moxygen --pages --output api.md /path/to/doxygen/xml
```

Headings, anchors, lists, tables, links, and code blocks are all rendered from the XML Doxygen emits for these pages.

## Groups

Use Doxygen groups when you want module-style output instead of one large API file.

```cpp
/// @defgroup transport Transport
/// Types and functions for transport devices.
/// @{

/// @brief Bicycle transport.
class Bicycle {};

/// @}
```

For explicit group XML, this is enough:

```bash
moxygen --groups --output api-%s.md /path/to/doxygen/xml
```

For file-level grouping where Doxygen keeps the real class and namespace ownership outside the group XML, add `--source-root`. See [Grouping Modes](./grouping-modes) for the full behavior.

## What renders well

This table starts from the comments users write. The XML column is included for debugging and issue reports.

| Doxygen input | XML Doxygen emits | Moxygen output |
|---------------|-------------------|----------------|
| `@brief` | `briefdescription` | Summary text for tables and page metadata |
| Paragraphs and Markdown | `detaileddescription`, `para` | Normal Markdown prose |
| `@param` | `parameterlist kind="param"` | Member parameter table when descriptions are present |
| `@return` / `@returns` | `simplesect kind="return"` | Returns section |
| `@warning`, `@attention` | `simplesect kind="warning"` / `attention` | Warning block |
| `@note`, `@remark` | `simplesect kind="note"` / `remark` | Note block |
| `@deprecated` | `simplesect kind="deprecated"` | Warning block marked deprecated |
| `@see` | `simplesect kind="see"` | See also line |
| `@since` | `simplesect kind="since"` | Since line |
| `@ref`, `\ref` | `ref` | Internal Markdown link, resolved to the right file and anchor |
| Markdown links | `ulink` | External or relative Markdown link |
| Markdown headings / Doxygen sections | `sect1` through `sect6`, `title` | Markdown headings with optional anchors |
| `@anchor` | `anchor` | Pandoc or HTML anchor when anchor output is enabled |
| Markdown lists | `orderedlist`, `itemizedlist`, `listitem` | Ordered and unordered Markdown lists |
| Variable lists | `variablelist`, `varlistentry`, `term` | Bold term with description text |
| Markdown tables | `table`, `row`, `entry` | Markdown table |
| Fenced code / `@code` / source listings | `programlisting`, `verbatim` | Fenced code block |
| Inline emphasis, bold, code | `emphasis`, `bold`, `computeroutput` | Markdown emphasis, bold, and inline code |
| Formulas | `formula` | Inline math or fenced display math |
| En dash, em dash, line breaks | `ndash`, `mdash`, `linebreak` | Markdown-safe HTML entity or line break |
| Classes, structs, unions, interfaces | `compounddef kind="class"` / `struct` / `union` / `interface` | Type page with member sections |
| Enums and enum values | `memberdef kind="enum"`, `enumvalue` | Enum signature and value table |
| Groups | `compounddef kind="group"` | Group/module page when `--groups` is enabled |

## Known gaps

Moxygen does not try to mirror every Doxygen HTML feature. The goal is clean Markdown API docs.

The main gaps are:

- Diagrams and media-oriented tags such as `image`, `dot`, `msc`, and `plantuml` are not converted into generated assets.
- Doxygen bookkeeping tags such as `indexentry`, `toclist`, `language`, and `copydoc` are not first-class output features.
- Full named-entity coverage is not exhaustive, though common page punctuation such as `mdash`, `ndash`, and `linebreak` is handled.
- Template parameter docs may appear in the rendered detail text, but they are not promoted into a separate structured table like function parameters.

If output looks wrong, run without `--quiet`. Unsupported XML tags are reported as warnings so you can see exactly what Doxygen emitted.
