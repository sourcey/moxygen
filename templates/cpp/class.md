{{cleanAnchor refid name}}

{{headingMarker 1}} {{shortname name}}

{{#if includes}}
```cpp
#include <{{includes}}>
```
{{/if}}

```cpp
{{classSignature}}
```

{{#if (sourceLabel)}}{{#if (sourceHref)}}[Defined in {{sourceLabel}}]({{sourceHref}}){{else}}Defined in {{sourceLabel}}{{/if}}
{{/if}}

{{#if basecompoundref}}> **Inherits:** {{#each basecompoundref}}{{linkedName name refid}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}
{{#if derivedcompoundref}}> **Subclassed by:** {{#each derivedcompoundref}}{{linkedName name refid}}{{#unless @last}}, {{/unless}}{{/each}}
{{/if}}

{{briefdescription}}

{{detaileddescription}}

{{#if allMembers}}
{{headingMarker 2}} List of all members

| Name | Kind | Owner |
|------|------|-------|
{{#each allMembers}}| {{linkedName name refid}} | `{{kind}}` | {{#if inherited}}Inherited from {{linkedName owner ownerRefid}}{{else}}Declared here{{/if}} |
{{/each}}

{{/if}}
{{#each inheritedMemberGroups}}
{{headingMarker 2}} Inherited from {{linkedName name refid}}

| Kind | Name | Description |
|------|------|-------------|
{{#each members}}| `{{kind}}` | {{linkedName name refid}} {{badges}} | {{cell (memberSummary this)}} |
{{/each}}

{{/each}}
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

```cpp
{{signature}}
```

{{#if (sourceLabel)}}{{#if (sourceHref)}}[Defined in {{sourceLabel}}]({{sourceHref}}){{else}}Defined in {{sourceLabel}}{{/if}}
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
{{#each (documentedParams params)}}| `{{name}}` | `{{type}}` | {{description}} |
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
