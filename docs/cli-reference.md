---
title: CLI Reference
description: Command-line options and usage
---

# CLI Reference

```bash
moxygen [options] <doxygen XML directory>
```

## Options

| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Output file, must contain `%s` when using groups or classes |
| `-g, --groups` | Output doxygen groups into separate files |
| `-c, --classes` | Output doxygen classes into separate files |
| `-p, --pages` | Output doxygen pages into separate files |
| `-n, --noindex` | Disable generation of the index |
| `-a, --anchors` | Add anchors to internal links |
| `-H, --html-anchors` | Add HTML anchors to internal links |
| `-l, --language <lang>` | Programming language (default: `cpp`) |
| `-t, --templates <dir>` | Custom templates directory |
| `-s, --source-root <dir>` | Source root for file-level group resolution |
| `-f, --frontmatter` | Prepend YAML frontmatter to output files |
| `-L, --logfile [file]` | Output log messages to file |
| `-q, --quiet` | Quiet mode |
