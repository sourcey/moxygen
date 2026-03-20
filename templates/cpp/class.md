## {{shortname name}} {{cleanAnchor refid name}}

{{#if includes}}
```cpp
#include <{{includes}}>
```
{{/if}}

{{#if basecompoundref}}> **Inherits:** {{#each basecompoundref}}{{linkedName name refid}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if derivedcompoundref}}> **Subclassed by:** {{#each derivedcompoundref}}{{linkedName name refid}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{briefdescription}}

{{detaileddescription}}

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
