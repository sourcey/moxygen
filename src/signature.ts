import { stripMarkdownLinks } from './helpers.js';

/**
 * Rendering a member's declaration.
 *
 * This is the one place that knows how to turn a parsed member into a
 * declaration string. Templates render it inside a code fence, and the search
 * index falls back to it when Doxygen supplied no `<definition>`, so both go
 * through here rather than keeping separate notions of what a declaration
 * looks like.
 *
 * Output is plain text: markdown links are flattened, because a fence renders
 * them literally and a search snippet has no use for them.
 */

type Params = Array<{ type?: string; name?: string; defaultValue?: string }>;

const text = (value: unknown): string => stripMarkdownLinks(String(value ?? '')).trim();

/** `template<typename T, int N = 4>`, or empty when there are no parameters. */
export function formatTemplateParams(params: unknown): string {
  if (!Array.isArray(params) || params.length === 0) return '';
  const declarations = (params as Params).map((param) => {
    const type = text(param.type);
    const name = text(param.name);
    const defaultValue = text(param.defaultValue);
    return `${name ? `${type} ${name}` : type}${defaultValue ? ` = ${defaultValue}` : ''}`;
  }).filter(Boolean);
  return `template<${declarations.join(', ')}>`;
}

/** `int limit = 2048, char`, keeping whichever half of each parameter exists. */
function formatParams(params: unknown): string {
  if (!Array.isArray(params)) return '';
  return (params as Params).map((param) => {
    const defaultValue = text(param.defaultValue);
    // Either half can be absent: unnamed parameters carry only a type, and
    // macro parameters carry only a name.
    const declaration = [text(param.type), param.name].filter(Boolean).join(' ');
    return `${declaration}${defaultValue ? ` = ${defaultValue}` : ''}`;
  }).join(', ');
}

export function renderSignature(member: Record<string, unknown>): string {
  const kind = member.kind as string;

  if (kind === 'enum') {
    return `enum ${member.name}`;
  }

  if (kind === 'typedef') {
    const returnType = text(member.returnType);
    return returnType
      ? `using ${member.name} = ${returnType}`
      : String(member.definition ?? `using ${member.name}`);
  }

  if (kind === 'friend' && !String(member.argsstring ?? '').trim()) {
    return [formatTemplateParams(member.templateParams), 'friend', text(member.returnType), text(member.name)]
      .filter(Boolean)
      .join(' ');
  }

  if (kind === 'variable' || kind === 'property') {
    const initializer = kind === 'variable' ? text(member.initializer) : '';
    return [text(member.returnType), member.name, initializer].filter(Boolean).join(' ');
  }

  if (kind === 'define') {
    // Object-like macros take no argument list at all, so parens are only
    // correct when Doxygen reported macro parameters.
    const params = (member.params ?? []) as Params;
    const args = params.length ? `(${params.map((p) => p.name).filter(Boolean).join(', ')})` : '';
    const initializer = text(member.initializer);
    return `#define ${member.name}${args}${initializer ? ` ${initializer}` : ''}`;
  }

  // Callable: function, signal, slot, and friends declared with arguments.
  const parts: string[] = [];
  if (kind === 'friend') parts.push('friend');
  parts.push(formatTemplateParams(member.templateParams));
  parts.push(...((member.prefixQualifiers as string[]) ?? []));
  if (member.isVirtual) parts.push('virtual');
  if (member.isStatic) parts.push('static');
  if (member.isInline) parts.push('inline');
  if (member.isExplicit) parts.push('explicit');
  parts.push(text(member.returnType));
  parts.push(`${member.name}(${formatParams(member.params)})`);
  parts.push(...((member.qualifiers as string[]) ?? []));

  return parts.filter(Boolean).join(' ');
}
