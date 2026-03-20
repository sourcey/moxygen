# {{shortname name}} {{cleanAnchor refid name}}

{{briefdescription}}

{{detaileddescription}}

{{#if filtered.compounds}}
### Classes

| Name | Description |
|------|-------------|
{{#each filtered.compounds}}| [`{{shortname name}}`](#{{cleanId refid name}}) | {{cell summary}} |
{{/each}}
{{/if}}

{{#each filtered.sections}}
### {{label}}

| Return | Name | Description |
|--------|------|-------------|
{{#each members}}| `{{returnTypeShort}}` | [`{{name}}`](#{{cleanId refid name}}) {{badges}} | {{cell summary}} |
{{/each}}

{{#each members}}

---

#### {{name}} {{cleanAnchor refid name}}

{{badges}}

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
{{/each}}
