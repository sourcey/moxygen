
---

{{cleanAnchor refid name}}

{{headingMarker 3}} {{name}}

{{badges}}

```cpp
{{signature}}
```

{{#if (linkedType)}}Type: {{linkedType}}

{{/if}}{{#if (sourceLabel)}}{{#if (sourceHref)}}[Defined in {{sourceLabel}}]({{sourceHref}}){{else}}Defined in {{sourceLabel}}{{/if}}
{{/if}}

{{briefdescription}}

{{detaileddescription}}

{{#if referencedBy}}
{{headingMarker 4}} Referenced by

{{#each referencedBy}}- {{linkedName name refid}}
{{/each}}

{{/if}}
{{#if references}}
{{headingMarker 4}} References

{{#each references}}- {{linkedName name refid}}
{{/each}}

{{/if}}
{{#if reimplements}}
{{headingMarker 4}} Reimplements

{{#each reimplements}}- {{linkedName name refid}}
{{/each}}

{{/if}}
{{#if reimplementedBy}}
{{headingMarker 4}} Reimplemented by

{{#each reimplementedBy}}- {{linkedName name refid}}
{{/each}}

{{/if}}

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
