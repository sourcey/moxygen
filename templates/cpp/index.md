# API Reference

| Name | Description |
|------|-------------|
{{#each filtered.members}}| [`{{name}}`](#{{refid}}) | {{summary}} |
{{/each}}{{#each filtered.compounds}}| [`{{shortname name}}`](#{{refid}}) | {{summary}} |
{{/each}}

{{#if filtered.members}}
## Members

{{#each filtered.members}}
---

#### {{name}} {{anchor refid}}

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
{{/if}}
