## {{shortname name}} {{anchor refid}}

{{#if basecompoundref}}> **Extends:** {{#each basecompoundref}}`{{name}}`{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}{{#if derivedcompoundref}}> **Subclasses:** {{#each derivedcompoundref}}`{{name}}`{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}{{#if includes}}> **Defined in:** `{{includes}}`
{{/if}}

{{briefdescription}}

{{detaileddescription}}

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
