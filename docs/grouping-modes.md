---
title: Grouping Modes
description: How Moxygen handles Doxygen grouping styles
---

# Grouping Modes

Moxygen supports both common Doxygen documentation styles.

## Explicit grouped compounds

Use `@defgroup`, `@ingroup`, and related tags. Doxygen produces normal group XML and Moxygen renders those groups directly.

```bash
moxygen --groups --output api-%s.md /path/to/xml
```

## File-level grouped code

Some codebases group files with `@addtogroup` / `@ingroup`, but Doxygen emits sparse group XML and leaves the real compound ownership in file XML.

Moxygen recovers those grouped classes, namespaces, and members when you pass `--source-root`:

```bash
moxygen --groups \
  --source-root /path/to/project/src \
  --output api-%s.md \
  /path/to/doxygen/xml
```

Shared umbrella namespaces across multiple groups are preserved without dropping group-owned root classes, and cross-page refs are resolved correctly for both markdown mirrors and generated multi-page output.

If your XML already contains fully populated groups, `--source-root` is optional.
