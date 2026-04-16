---
title: Introduction
description: Doxygen XML to Markdown converter
---

# Moxygen

Doxygen's parser is solid; its HTML output looks like 1998. Every tool that tried to replace the parser stalled. The other option is a four-tool Breathe + Exhale + Sphinx pipeline. Moxygen takes a simpler approach: parse the XML, emit clean Markdown, let your docs tool handle the rest.

## Features

- **Multi-language** — C++ and Java supported out of the box
- **Multi-page output** — single file, per-group, per-class, or per-page
- **Internal linking** — anchors in comments and function definitions
- **Markdown comments** — Markdown in Doxygen comments is rendered
- **Doxygen groups** — grouping support for organised docs
- **Structured landing pages** — namespace and group pages separate nested namespaces, types, and enums
- **Custom templates** — modify the Handlebars templates to suit your needs
- **Programmatic API** — use as a library, not just a CLI
