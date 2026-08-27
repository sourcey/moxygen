# Changelog

Notable changes per release. Older history is in the git log.

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
