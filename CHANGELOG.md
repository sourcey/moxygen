# Changelog

Notable changes per release. Older history is in the git log.

## 2.1.19 - 2026-09-01

### Added

- `--flavour github` renders admonitions as GitHub alerts, so `@note` becomes `> [!NOTE]` rather than the Pandoc `:::note` container that GitHub shows as literal text. `@warning` maps to `[!WARNING]`, `@attention` to `[!IMPORTANT]`, `@remark` to `[!NOTE]`. The default stays `pandoc` with unchanged output, and `--flavor` is accepted too. Requested by @gkodinov in #126.

### Fixed

- Nested lists keep their nesting, and list items no longer have a blank line between them. Indentation is measured against the parent item's marker, so a list under `1. ` indents three spaces and one under `* ` indents two, which is what Markdown requires to nest. Reported by @gkodinov in #115.
- Definition lists no longer put a blank line between terms.
- An admonition inside a list item sits at the item's content column instead of ending the list.

## 2.1.18 - 2026-09-01

### Changed

- Republished 2.1.17 through the release pipeline so the artifact carries npm provenance. No code changes.

## 2.1.17 - 2026-09-01

### Fixed

- Function pointers document their parameters and render as declarations. `int (*retry)(int attempt, const char *reason)` previously printed as `int(* retry` with its `@param` list dropped, because parameters were collected only for a fixed set of member kinds and Doxygen reports a function pointer as a variable. Reported by @gkodinov in #131.
- A member's own section links to its type, so a struct member pointing at another documented type can be followed without hunting back up to the summary table. Types with nothing to point at add nothing. Raised by @gkodinov in #130.

### Changed

- Member sections are consistent across class, namespace, group and index pages. Namespace, group and index pages gain the `Defined in` source links and separators that only class pages had, and enum value tables sit in the same place everywhere.
- The all-members table appears only on classes that actually inherit members. Without inheritance its Owner column says nothing and it repeated the section table below it with less detail. Raised by @gkodinov in #130.

## 2.1.16 - 2026-08-28

### Fixed

- Parameter types that cross-reference another documented symbol rendered their link literally, as `` `struct [handlers](#handlers) *` ``, because a link cannot live inside a code span. Referenced types now keep the link and style the symbol the way names are styled elsewhere: `struct [`handlers`](#handlers) *`. Types with no reference are unchanged. Raised by @gkodinov in #127.
- Return types in member summary tables link to the referenced symbol instead of being flattened to plain text.

## 2.1.15 - 2026-08-28

### Fixed

- Initializers that cross-reference another documented symbol keep the reference. `#define RETRY_HOOK registry->retry` rendered as `#define RETRY_HOOK ->retry`, because the initializer was read as flat text and every `<ref>` child was discarded. Reported by @gkodinov in #127.

  Macros gained initializer rendering in 2.1.13, so they showed this from that release. Variable initializers were affected for longer, and are fixed by the same change.

## 2.1.14 - 2026-08-27

### Changed

- `commander` moved to ^15.0.0. New installs resolve a different major of the CLI argument parser, verified against the full CLI surface: help, version, every flag, `%s` output patterns and the missing-argument error path.
- Development dependencies moved to TypeScript ^7.0.2, vitest ^4.1.11 and @types/node ^26.2.0.

No change to generated output.

## 2.1.13 - 2026-08-27

### Fixed

- Macros render by their real shape. Function-like macros keep their parameters, object-like macros no longer gain empty parens, and both show their initializer. Thanks to @gkodinov for the report and the parser fix.
- Group pages keep their detailed description instead of collapsing to the brief. Applies to both the cpp and java templates.
- Unnamed function parameters keep their type in signatures.
- Parameter tables no longer render empty backticks for parameters that have no type, which is every macro parameter.

### Changed

- Undocumented members are no longer dropped. Doxygen only emits a member when the project asked for it, by documenting it, by placing it in a documented group, or by setting `EXTRACT_ALL`, so filtering on missing documentation was overriding an explicit choice. **Projects running `EXTRACT_ALL = YES` will see more members in their output than on 2.1.12.**
