# API Reference

{{#with (compoundsOfKind filtered.compounds "group") as |groups|}}
{{#if groups}}
### Groups

| Name | Description |
|------|-------------|
{{#each groups}}| {{linkedName shortname refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#with (compoundsOfKind filtered.compounds "namespace") as |namespaces|}}
{{#if namespaces}}
### Namespaces

| Name | Description |
|------|-------------|
{{#each namespaces}}| {{linkedName name refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#with (compoundsOfKind filtered.compounds "class" "struct" "interface") as |types|}}
{{#if types}}
### Classes

| Name | Description |
|------|-------------|
{{#each types}}| {{linkedName name refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#with (compoundsOfKind filtered.compounds "enum") as |enums|}}
{{#if enums}}
### Enumerations

| Name | Description |
|------|-------------|
{{#each enums}}| {{linkedName name refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#each filtered.sections}}
## {{label}}

{{#each members}}

{{cleanAnchor refid name}}

#### {{name}}

```cpp
{{signature}}
```

{{briefdescription}}

{{#if enumvalue}}
| Value | Description |
|-------|-------------|
{{#each enumvalue}}| `{{name}}` | {{summary}} |
{{/each}}
{{/if}}

{{detaileddescription}}

{{/each}}
{{/each}}
