import { describe, expect, it } from 'vitest';
import Handlebars from 'handlebars';
import { registerHelpers } from '../src/templates.js';

registerHelpers({ anchors: true, htmlAnchors: false });

const renderParamTable = Handlebars.compile(`
{{#if (hasDocumentedParams params)}}
| Parameter | Type | Description |
|-----------|------|-------------|
{{#each (documentedParams params)}}| \`{{name}}\` | \`{{type}}\` | {{description}} |
{{/each}}
{{/if}}
`);

describe('template helpers', () => {
  it('omits the parameter table when no parameter has documentation', () => {
    const output = renderParamTable({
      params: [
        { name: 'loop', type: 'Loop *', description: '' },
        { name: 'mode', type: 'uv_run_mode', description: '   ' },
      ],
    }).trim();

    expect(output).toBe('');
  });

  it('renders only documented parameters when the list is mixed', () => {
    const output = renderParamTable({
      params: [
        { name: 'loop', type: 'Loop *', description: '' },
        { name: 'mode', type: 'uv_run_mode', description: 'libuv run mode.' },
      ],
    });

    expect(output).toContain('| Parameter | Type | Description |');
    expect(output).toContain('| `mode` | `uv_run_mode` | libuv run mode. |');
    expect(output).not.toContain('| `loop` | `Loop *` |');
  });
});
