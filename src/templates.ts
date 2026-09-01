import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Handlebars from 'handlebars';
import { getAnchor, cleanId, stripMarkdownLinks } from './helpers.js';
import type { AnchorMap } from './helpers.js';
import { log } from './logger.js';
import { formatTemplateParams, renderSignature } from './signature.js';
import { sectionHasReturnColumn } from './vocabulary.js';
import type { Compound, MoxygenOptions, SourceUrlRoute } from './types.js';

const templates: Record<string, HandlebarsTemplateDelegate> = {};
let activeAnchorMap: AnchorMap | undefined;

export interface RenderContext {
  headingBase: number;
}

const DEFAULT_RENDER_CONTEXT: RenderContext = {
  headingBase: 1,
};

const MARKDOWN_LINK = /\[([^\]]+)\]\(([^)]+)\)/;
const MARKDOWN_LINKS = /\[([^\]]+)\]\(([^)]+)\)/g;

/**
 * Render a type for a table cell.
 *
 * Types carry cross-references to other documented symbols. Wrapping the whole
 * type in a code span turns those into literal `[name](href)` text, because a
 * link cannot live inside a code span. So a type holding references keeps them
 * as links, styling each reference the way names are styled elsewhere, and a
 * plain type stays fully inline code.
 */
function typeCell(type: string): string {
  const trimmed = (type || '').trim();
  if (!trimmed) return '';

  if (!MARKDOWN_LINK.test(trimmed)) return `\`${trimmed}\``;
  return trimmed.replace(MARKDOWN_LINKS, '[`$1`]($2)');
}

function headingLevel(relativeLevel: unknown, context: RenderContext): number {
  const relative = Number(relativeLevel);
  const base = Number.isFinite(context.headingBase) ? context.headingBase : 1;
  const level = base + (Number.isFinite(relative) ? relative : 1) - 1;
  return Math.min(Math.max(level, 1), 6);
}

/**
 * Set the anchor map used by cleanAnchor/cleanId helpers.
 * Call before rendering a batch of compounds.
 */
export function setAnchorMap(map: AnchorMap | undefined): void {
  activeAnchorMap = map;
}

/**
 * Register Handlebars helpers for template rendering.
 */
export function registerHelpers(options: Pick<MoxygenOptions, 'anchors' | 'htmlAnchors' | 'sourceUrl'>): void {
  const encodePath = (value: string): string =>
    value.split('/').map((part) => encodeURIComponent(part)).join('/');

  const applySourceUrlTemplate = (
    base: string,
    fullPath: string,
    line: string,
    routedPath = fullPath,
  ): string => {
    if (base.includes('{path}') || base.includes('{fullPath}') || base.includes('{line}')) {
      const url = base
        .replace(/\{path\}/g, encodePath(routedPath))
        .replace(/\{fullPath\}/g, encodePath(fullPath))
        .replace(/\{line\}/g, line);
      return line && !base.includes('{line}') ? `${url}#L${encodeURIComponent(line)}` : url;
    }

    const separator = base.endsWith('/') ? '' : '/';
    const url = `${base}${separator}${encodePath(fullPath)}`;
    return line ? `${url}#L${encodeURIComponent(line)}` : url;
  };

  const matchingSourceRoute = (routes: SourceUrlRoute[], path: string): SourceUrlRoute | undefined =>
    routes
      .filter((route) => path.startsWith(route.prefix))
      .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  const resolvedSourceHref = (path: string, line: string, symbol?: string): string => {
    const sourceUrl = options.sourceUrl;
    if (!sourceUrl) return '';

    if (Array.isArray(sourceUrl)) {
      const route = matchingSourceRoute(sourceUrl, path);
      if (!route?.url) return '';
      const routedPath = path.slice(route.prefix.length);
      return applySourceUrlTemplate(route.url, path, line, routedPath);
    }

    const base = typeof sourceUrl === 'function'
      ? sourceUrl({ path, line: line || undefined, symbol })
      : sourceUrl;
    return base ? applySourceUrlTemplate(base, path, line) : '';
  };

  const cleanCellText = (value: string): string => {
    const lines = (value || '').split(/\n+/);
    const kept: string[] = [];
    for (const line of lines) {
      if (/^#{2,6}\s+(Parameters|Template Parameters|Exceptions|Returns?|Return Values)\b/i.test(line.trim())) {
        break;
      }
      kept.push(line);
    }
    return kept.join(' ').replace(/\s+/g, ' ').trim();
  };


  const sourceLabel = (record: Record<string, unknown>): string => {
    const location = typeof record.location === 'string' ? record.location : '';
    if (!location) return '';
    const line = typeof record.locationLine === 'string' ? record.locationLine : '';
    return line ? `${location}:${line}` : location;
  };

  const sourceHref = (record: Record<string, unknown>): string => {
    const location = typeof record.location === 'string' ? record.location : '';
    if (!options.sourceUrl || !location) return '';

    const path = location.replace(/^\.?\//, '');
    const line = typeof record.locationLine === 'string' ? record.locationLine : '';
    const symbol = typeof record.name === 'string' ? record.name : undefined;
    return resolvedSourceHref(path, line, symbol);
  };

  const synthesizedMemberSummary = (member: Record<string, unknown>): string => {
    const summary = typeof member.summary === 'string' ? cleanCellText(member.summary) : '';
    if (summary) return summary;

    const qualifiers = Array.isArray(member.qualifiers)
      ? member.qualifiers.filter((q): q is string => typeof q === 'string')
      : [];
    const name = typeof member.name === 'string' ? member.name : '';
    const returnType = typeof member.returnType === 'string' ? member.returnType.trim() : '';

    const adjective = qualifiers.includes('= delete')
      ? 'Deleted'
      : qualifiers.includes('= default')
        ? 'Defaulted'
        : '';

    if (!adjective) return '';
    if (name === 'operator=') return `${adjective} assignment operator.`;
    if (name.startsWith('~')) return `${adjective} destructor.`;
    if (!returnType) return `${adjective} constructor.`;
    return `${adjective} member function.`;
  };

  // Classic helpers
  Handlebars.registerHelper('cell', (code: string) =>
    cleanCellText(code).replace(/\|/g, '\\|').replace(/\n/g, '<br/>'),
  );

  Handlebars.registerHelper('headingMarker', (relativeLevel: unknown, helperOptions: Handlebars.HelperOptions) => {
    const context = (helperOptions.data?.renderContext ?? DEFAULT_RENDER_CONTEXT) as RenderContext;
    return '#'.repeat(headingLevel(relativeLevel, context));
  });

  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

  Handlebars.registerHelper('or', (a: unknown, b: unknown) => a || b);

  Handlebars.registerHelper('compoundsOfKind', (compounds: unknown, ...args: unknown[]) => {
    const options = args[args.length - 1];
    void options;
    const kinds = new Set(
      args
        .slice(0, -1)
        .filter((value): value is string => typeof value === 'string'),
    );
    if (!Array.isArray(compounds) || !kinds.size) {
      return [];
    }
    return compounds.filter((compound) =>
      compound &&
      typeof compound === 'object' &&
      'kind' in compound &&
      kinds.has((compound as Record<string, unknown>).kind as string),
    );
  });

  Handlebars.registerHelper('shortname', (fullname: string) => {
    const parts = (fullname || '').split('::');
    return parts[parts.length - 1] || fullname;
  });

  Handlebars.registerHelper('signature', function (this: Record<string, unknown>) {
    return renderSignature(this as Record<string, unknown>);
  });

  Handlebars.registerHelper('badges', function (this: Record<string, unknown>) {
    const member = this as Record<string, unknown>;
    const badges: string[] = [];
    const prot = member.prot as string;
    if (prot && prot !== 'public') badges.push(prot);
    if (member.isVirtual) badges.push('virtual');
    if (member.isStatic) badges.push('static');
    if (member.isConst) badges.push('const');
    if (member.isInline) badges.push('inline');
    if (member.isExplicit) badges.push('explicit');
    if (member.isNodiscard) badges.push('nodiscard');
    if (member.isConstexpr) badges.push('constexpr');
    if (member.isConsteval) badges.push('consteval');
    const qualifiers = Array.isArray(member.qualifiers)
      ? member.qualifiers.filter((q): q is string => typeof q === 'string')
      : [];
    for (const q of qualifiers) {
      if (q === 'const' || q === '= delete' || q === '= default') continue;
      badges.push(q);
    }
    return badges.map(b => `\`${b}\``).join(' ');
  });

  Handlebars.registerHelper('hasParams', function (this: Record<string, unknown>) {
    const params = this.params as Array<{ name: string }>;
    return params && params.length > 0 && params.some(p => p.name);
  });

  Handlebars.registerHelper('documentedParams', (params: unknown) => {
    if (!Array.isArray(params)) {
      return [];
    }
    return params.filter((param) => {
      if (!param || typeof param !== 'object') {
        return false;
      }
      const record = param as Record<string, unknown>;
      const name = typeof record.name === 'string' ? record.name.trim() : '';
      const description = typeof record.description === 'string'
        ? record.description.trim()
        : '';
      return !!name && !!description;
    });
  });

  Handlebars.registerHelper('hasDocumentedParams', (params: unknown) => {
    if (!Array.isArray(params)) {
      return false;
    }
    return params.some((param) => {
      if (!param || typeof param !== 'object') {
        return false;
      }
      const record = param as Record<string, unknown>;
      const name = typeof record.name === 'string' ? record.name.trim() : '';
      const description = typeof record.description === 'string'
        ? record.description.trim()
        : '';
      return !!name && !!description;
    });
  });

  Handlebars.registerHelper('memberSummary', function (this: Record<string, unknown>) {
    return synthesizedMemberSummary(this);
  });

  Handlebars.registerHelper('classSignature', function (this: Record<string, unknown>) {
    const templatePrefix = formatTemplateParams(this.templateParams);
    const kind = this.kind === 'interface' ? 'class' : String(this.kind ?? 'class');
    const name = this.shortname || this.name;
    return [templatePrefix, `${kind} ${name}`].filter(Boolean).join('\n');
  });

  Handlebars.registerHelper('sourceLabel', function (this: Record<string, unknown>) {
    return sourceLabel(this);
  });

  Handlebars.registerHelper('sourceHref', function (this: Record<string, unknown>) {
    return sourceHref(this);
  });

  // Clean anchor: generates a readable anchor, using the anchor map for consistency
  Handlebars.registerHelper('cleanAnchor', (refid: string, name: string) => {
    const id = activeAnchorMap?.get(refid) ?? cleanId(name || refid);
    return getAnchor(id, options);
  });

  // Clean ID: returns the clean id string for href targets, using the anchor map
  Handlebars.registerHelper('cleanId', (refid: string, name: string) => {
    return activeAnchorMap?.get(refid) ?? cleanId(name || refid);
  });

  // Return type for summary tables: strip markdown links to plain text
  Handlebars.registerHelper('typeCell', (type: unknown) => typeCell(String(type ?? '')));

  Handlebars.registerHelper('returnTypeShort', function (this: Record<string, unknown>) {
    return typeCell((this.returnType as string) || '');
  });

  // Linked name: renders as markdown link if refid exists
  Handlebars.registerHelper('linkedName', (name: string, refid: string) => {
    const short = (name || '').split('::').pop() || name;
    if (refid) return `[\`${short}\`]({#ref ${refid} #})`;
    return `\`${short}\``;
  });

  Handlebars.registerHelper('groupBreadcrumbs', (compound: Compound) => {
    const breadcrumbs: Compound[] = [];
    let current = compound.parent as Compound | null;
    while (current) {
      if (current.kind === 'group') {
        breadcrumbs.unshift(current);
      }
      current = current.parent as Compound | null;
    }
    return breadcrumbs;
  });

  // Not helper for conditionals
  Handlebars.registerHelper('not', (value: unknown) => !value);

  Handlebars.registerHelper('hasReturnColumn', sectionHasReturnColumn);

  // A member's own section shows its declaration in a code fence, where a link
  // cannot exist. Echo the type as a link when it points somewhere, so the
  // reader can reach it without hunting back up to the summary table. Types
  // with nothing to point at add no line.
  Handlebars.registerHelper('linkedType', function (this: Record<string, unknown>) {
    // Callable members already link their types: the return type in the
    // summary table, the argument types in the parameter table. Only a plain
    // typed member has nowhere else to show it.
    const callable = String(this.argsstring ?? '').trim() || (this.params as unknown[])?.length;
    if (callable) return '';

    const type = String(this.returnType ?? '');
    return /\[[^\]]+\]\([^)]+\)/.test(type) ? typeCell(type) : '';
  });

  Handlebars.registerHelper('hasInheritedMembers', (entries: unknown) =>
    Array.isArray(entries) && entries.some((entry) => (entry as { inherited?: boolean }).inherited));
}

/**
 * Load all .md templates from the given directory.
 */
export function load(templateDirectory: string): void {
  for (const filename of readdirSync(templateDirectory)) {
    const fullpath = join(templateDirectory, filename);
    const match = filename.match(/(.*)\.md$/);
    if (!match) continue;

    const content = readFileSync(fullpath, 'utf8');
    const compiled = Handlebars.compile(content, {
      noEscape: true,
      strict: true,
    });

    // A leading underscore marks a partial: shared markup included by the
    // page templates rather than a page in its own right. Compiled here so it
    // gets the same options, and loaded from the active template directory so
    // a copied directory keeps working.
    if (match[1].startsWith('_')) {
      Handlebars.registerPartial(match[1].slice(1), compiled);
      continue;
    }

    templates[match[1]] = compiled;
  }
}

/**
 * Render a single compound using the appropriate template.
 */
export function render(compound: Compound, context: RenderContext = DEFAULT_RENDER_CONTEXT): string | undefined {
  let templateName: string;

  log.verbose(`Rendering ${compound.kind} ${compound.fullname}`);

  switch (compound.kind) {
    case 'index':
      templateName = 'index';
      break;
    case 'page':
      templateName = 'page';
      break;
    case 'group':
      templateName = 'namespace';
      break;
    case 'namespace': {
      const keys = Object.keys(compound.compounds);
      if (
        keys.length === 1 &&
        compound.compounds[keys[0]].kind === 'namespace'
      ) {
        return undefined;
      }
      templateName = 'namespace';
      break;
    }
    case 'class':
    case 'struct':
    case 'union':
    case 'interface':
    case 'enum':
    case 'concept':
      templateName = 'class';
      break;
    default:
      log.warn(`Cannot render ${compound.kind} ${compound.fullname}`);
      return undefined;
  }

  if (!templates[templateName]) {
    throw new Error(`Template "${templateName}" not found in your templates directory.`);
  }

  return templates[templateName](compound, {
    data: {
      renderContext: context,
    },
  }).replace(/(\r\n|\r|\n){3,}/g, '$1\n');
}

/**
 * Render an array of compounds.
 */
export function renderArray(
  compounds: Compound[],
  contextFor: (compound: Compound, index: number) => RenderContext = (_compound, index) => ({
    headingBase: index === 0 ? 1 : 2,
  }),
): (string | undefined)[] {
  return compounds.map((compound, index) => render(compound, contextFor(compound, index)));
}
