{{cleanAnchor refid name}}

{{headingMarker 1}} {{shortname name}}

{{#if basecompoundref}}> **Extends:** {{#each basecompoundref}}{{linkedName name refid}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if derivedcompoundref}}> **Subclassed by:** {{#each derivedcompoundref}}{{linkedName name refid}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{briefdescription}}

{{detaileddescription}}

{{#each filtered.sections}}
{{headingMarker 2}} {{label}}

{{#if (hasReturnColumn section)}}
| Return | Name | Description |
|--------|------|-------------|
{{#each members}}| {{returnTypeShort}} | [`{{name}}`](#{{cleanId refid name}}) {{badges}} | {{cell (memberSummary this)}} |
{{/each}}
{{else}}
| Name | Description |
|------|-------------|
{{#each members}}| [`{{name}}`](#{{cleanId refid name}}) {{badges}} | {{cell (memberSummary this)}} |
{{/each}}
{{/if}}

{{#each members}}

---

{{cleanAnchor refid name}}

{{headingMarker 3}} {{name}}

{{badges}}

```java
{{signature}}
```

{{briefdescription}}

{{detaileddescription}}

{{#unless briefdescription}}
{{#unless detaileddescription}}
{{memberSummary this}}
{{/unless}}
{{/unless}}

{{#if (hasDocumentedParams params)}}
{{headingMarker 4}} Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
{{#each (documentedParams params)}}| `{{name}}` | {{typeCell type}} | {{description}} |
{{/each}}
{{/if}}

{{#if returnValues}}
{{headingMarker 4}} Return Values

| Value | Description |
|-------|-------------|
{{#each returnValues}}| `{{name}}` | {{description}} |
{{/each}}
{{/if}}

{{#if exceptions}}
{{headingMarker 4}} Exceptions

| Exception | Description |
|-----------|-------------|
{{#each exceptions}}| `{{name}}` | {{description}} |
{{/each}}
{{/if}}

{{#if enumvalue}}
| Value | Description |
|-------|-------------|
{{#each enumvalue}}| `{{name}}` | {{summary}} |
{{/each}}
{{/if}}

{{/each}}
{{/each}}
