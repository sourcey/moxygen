# API Reference

{{#if filtered.compounds}}
| Name | Description |
|------|-------------|
{{#each filtered.compounds}}| [`{{shortname name}}`](#{{cleanId refid name}}) | {{cell summary}} |
{{/each}}
{{/if}}

{{#each filtered.sections}}
## {{label}}

{{#each members}}

#### {{name}} {{cleanAnchor refid name}}

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
