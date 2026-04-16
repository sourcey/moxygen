---
title: Quickstart
description: Get started with Moxygen in under a minute
---

# Quickstart

## Install

```bash
npm install moxygen -g
```

Requires Node.js 20+.

## Generate docs

1. Add `GENERATE_XML=YES` to your `Doxyfile`
2. Run `doxygen` to generate the XML
3. Run `moxygen` pointing to the XML output directory

```bash
moxygen --anchors /path/to/doxygen/xml
```

For multi-file grouped output:

```bash
moxygen --anchors --groups --output api-%s.md /path/to/doxygen/xml
```
