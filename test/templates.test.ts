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

const renderMemberSummary = Handlebars.compile(`{{memberSummary this}}`);
const renderSignature = Handlebars.compile(`{{signature}}`, { noEscape: true });
const renderSource = Handlebars.compile(`{{sourceLabel}}|{{sourceHref}}`, { noEscape: true });

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

  it('synthesizes deleted constructor summaries when documentation is missing', () => {
    const output = renderMemberSummary({
      name: 'PeerSession',
      returnType: '',
      summary: '',
      qualifiers: ['= delete'],
    }).trim();

    expect(output).toBe('Deleted constructor.');
  });

  it('synthesizes defaulted assignment summaries when documentation is missing', () => {
    const output = renderMemberSummary({
      name: 'operator=',
      returnType: 'Foo &',
      summary: '',
      qualifiers: ['= default'],
    }).trim();

    expect(output).toBe('Defaulted assignment operator.');
  });

  it('renders default parameter values in function signatures', () => {
    const output = renderSignature({
      kind: 'function',
      name: 'AsyncQueue',
      returnType: '',
      params: [{ type: 'int', name: 'limit', defaultValue: '2048' }],
      templateParams: [],
      qualifiers: [],
    }).trim();

    expect(output).toBe('AsyncQueue(int limit = 2048)');
  });

  it('keeps the type of unnamed parameters in function signatures', () => {
    const output = renderSignature({
      kind: 'function',
      name: 'reset',
      returnType: 'void',
      params: [{ type: 'int', name: '' }, { type: 'char', name: 'tag' }],
      templateParams: [],
      qualifiers: [],
    }).trim();

    expect(output).toBe('void reset(int, char tag)');
  });

  it('renders object-like macros without an argument list', () => {
    const output = renderSignature({
      kind: 'define',
      name: 'MAX_RETRIES',
      initializer: '5',
      params: [],
    }).trim();

    expect(output).toBe('#define MAX_RETRIES 5');
  });

  it('renders function-like macros with their parameters', () => {
    const output = renderSignature({
      kind: 'define',
      name: 'CLAMP',
      initializer: '',
      params: [{ type: '', name: 'VALUE' }, { type: '', name: 'LO' }, { type: '', name: 'HI' }],
    }).trim();

    expect(output).toBe('#define CLAMP(VALUE, LO, HI)');
  });

  it('renders zero-argument function-like macros with empty parens', () => {
    const output = renderSignature({
      kind: 'define',
      name: 'UNREACHABLE',
      initializer: '__builtin_unreachable()',
      params: [{ type: '', name: '' }],
    }).trim();

    expect(output).toBe('#define UNREACHABLE() __builtin_unreachable()');
  });

  it('renders typedefs as aliases instead of fake functions', () => {
    const output = renderSignature({
      kind: 'typedef',
      name: 'Queue',
      returnType: 'RunnableQueue< T >',
    }).trim();

    expect(output).toBe('using Queue = RunnableQueue< T >');
  });

  it('renders friend class declarations without function parens', () => {
    const output = renderSignature({
      kind: 'friend',
      name: 'icy::IntrusivePtr',
      returnType: 'class',
      argsstring: '',
      templateParams: [{ type: 'typename U', name: '' }],
    }).trim();

    expect(output).toBe('template<typename U> friend class icy::IntrusivePtr');
  });

  it('can render source labels and GitHub-style source URLs', () => {
    registerHelpers({
      anchors: true,
      htmlAnchors: false,
      sourceUrl: 'https://github.com/nilstate/icey/blob/main',
    });

    const output = renderSource({
      location: 'src/base/include/icy/queue.h',
      locationLine: '353',
    }).trim();

    expect(output).toBe(
      'src/base/include/icy/queue.h:353|https://github.com/nilstate/icey/blob/main/src/base/include/icy/queue.h#L353',
    );
  });

  it('can skip source links with a sourceUrl resolver', () => {
    registerHelpers({
      anchors: true,
      htmlAnchors: false,
      sourceUrl: ({ path }) => path.startsWith('src/graft/') ? undefined : 'https://github.com/nilstate/icey/blob/main',
    });

    const output = renderSource({
      location: 'src/graft/include/icy/graft/graft.h',
      locationLine: '94',
    }).trim();

    expect(output).toBe('src/graft/include/icy/graft/graft.h:94|');
  });

  it('routes source links by longest matching source prefix', () => {
    registerHelpers({
      anchors: true,
      htmlAnchors: false,
      sourceUrl: [
        { prefix: 'src/', url: 'https://github.com/nilstate/icey/blob/main/{fullPath}' },
        { prefix: 'src/pacm/', url: 'https://github.com/nilstate/pacm/blob/main/{path}#L{line}' },
        { prefix: 'src/graft/' },
      ],
    });

    const pacm = renderSource({
      location: 'src/pacm/include/icy/pacm/package.h',
      locationLine: '35',
    }).trim();
    const graft = renderSource({
      location: 'src/graft/include/icy/graft/graft.h',
      locationLine: '94',
    }).trim();
    const base = renderSource({
      location: 'src/base/include/icy/queue.h',
      locationLine: '353',
    }).trim();

    expect(pacm).toBe(
      'src/pacm/include/icy/pacm/package.h:35|https://github.com/nilstate/pacm/blob/main/include/icy/pacm/package.h#L35',
    );
    expect(graft).toBe('src/graft/include/icy/graft/graft.h:94|');
    expect(base).toBe(
      'src/base/include/icy/queue.h:353|https://github.com/nilstate/icey/blob/main/src/base/include/icy/queue.h#L353',
    );
  });
});
