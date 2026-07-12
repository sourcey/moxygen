{{cleanAnchor refid name}}

{{#if (eq kind "group")}}
{{headingMarker 1}} {{#if this.shortname}}{{this.shortname}}{{else}}{{shortname name}}{{/if}}

{{#with (groupBreadcrumbs this) as |breadcrumbs|}}
{{#if breadcrumbs}}
> {{#each breadcrumbs}}{{linkedName shortname refid}}{{#unless @last}} / {{/unless}}{{/each}}

{{/if}}
{{/with}}
{{summary}}
{{else}}
{{headingMarker 1}} {{shortname name}}

{{briefdescription}}

{{detaileddescription}}
{{/if}}

{{#with (compoundsOfKind filtered.compounds "group") as |groups|}}
{{#if groups}}
{{headingMarker 2}} Groups

| Name | Description |
|------|-------------|
{{#each groups}}| {{linkedName shortname refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#with (compoundsOfKind filtered.compounds "namespace") as |namespaces|}}
{{#if namespaces}}
{{headingMarker 2}} Namespaces

| Name | Description |
|------|-------------|
{{#each namespaces}}| {{linkedName name refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#with (compoundsOfKind filtered.compounds "class" "struct" "interface") as |types|}}
{{#if types}}
{{headingMarker 2}} Classes

| Name | Description |
|------|-------------|
{{#each types}}| {{linkedName name refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

{{#with (compoundsOfKind filtered.compounds "enum") as |enums|}}
{{#if enums}}
{{headingMarker 2}} Enumerations

| Name | Description |
|------|-------------|
{{#each enums}}| {{linkedName name refid}} | {{cell summary}} |
{{/each}}
{{/if}}
{{/with}}

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
