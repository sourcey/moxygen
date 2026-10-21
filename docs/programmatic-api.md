---
title: Programmatic API
description: Use Moxygen as a library
---

# Programmatic API

Two entry points: `run()` writes Markdown files to disk, `generate()` returns structured page objects for library consumers.

## run()

Writes files to disk. CLI equivalent.

```typescript
import { run } from 'moxygen';

await run({
  directory: '/path/to/doxygen/xml',
  output: 'api.md',
  anchors: true,
});

await run({
  directory: '/path/to/doxygen/xml',
  output: 'api-%s.md',
  groups: true,
  sourceRoot: '/path/to/project/src',
});
```

## generate()

Returns `GeneratedPage[]` without writing to disk. This is what Sourcey uses internally.

```typescript
import { generate } from 'moxygen';

const pages = await generate({
  directory: '/path/to/doxygen/xml',
  language: 'cpp',
});

for (const page of pages) {
  console.log(page.slug, page.title, page.kind);
  console.log(page.markdown);
}
```

Each page's `kind` says what it documents:

| `kind` | Page |
|--------|------|
| `group` | A `@defgroup` module, when the XML has groups |
| `namespace` | A namespace with a description, members or types of its own; one that only wraps others has no page |
| `class`, `struct`, `union`, `interface` | A type, in a namespace or at global scope |
| `globals` | The functions, variables and macros at global scope that no group claims |
| `page` | A Doxygen `@page` |
