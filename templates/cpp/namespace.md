# {{shortname name}} {{anchor refid}}

{{briefdescription}}

{{detaileddescription}}

{{#if filtered.compounds}}
### Classes

| Name | Description |
|------|-------------|
{{#each filtered.compounds}}| [`{{shortname name}}`](#{{refid}}) | {{summary}} |
{{/each}}
{{/if}}

{{#if filtered.members}}
### Members

| Name | Description |
|------|-------------|
{{#each filtered.members}}| [`{{name}}`](#{{refid}}) | {{summary}} |
{{/each}}

{{#each filtered.members}}
---

#### {{name}} {{anchor refid}}

```cpp
{{signature}}
```

{{briefdescription}}

{{detaileddescription}}

{{#if (hasParams)}}
| Parameter | Type | Description |
|-----------|------|-------------|
{{#each params}}{{#if name}}| `{{name}}` | `{{type}}` | {{description}} |
{{/if}}{{/each}}
{{/if}}

{{#if enumvalue}}
| Value | Description |
|-------|-------------|
{{#each enumvalue}}| `{{name}}` | {{summary}} |
{{/each}}
{{/if}}

{{/each}}
{{/if}}
