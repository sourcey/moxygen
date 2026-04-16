---
title: Custom Templates
description: Modify Handlebars templates for custom output
---

# Custom Templates

Moxygen uses Handlebars templates for output. The default modern templates produce clean Markdown with code-block signatures and parameter tables.

## Using classic templates

```bash
moxygen --templates ./templates/classic /path/to/xml
```

## Creating custom templates

Copy the `templates/cpp/` directory and modify. Templates receive the full parsed compound data including structured parameter info, inheritance, and more.

```bash
cp -r node_modules/moxygen/templates/cpp my-templates
moxygen --templates ./my-templates /path/to/xml
```
