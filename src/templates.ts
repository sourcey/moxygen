import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Handlebars from 'handlebars';
import { getAnchor, cleanId, stripMarkdownLinks } from './helpers.js';
import type { AnchorMap } from './helpers.js';
import { log } from './logger.js';
import type { Compound, MoxygenOptions } from './types.js';

const templates: Record<string, HandlebarsTemplateDelegate> = {};
let activeAnchorMap: AnchorMap | undefined;

 * Set the anchor map used by cleanAnchor/cleanId helpers.
 * Call before rendering a batch of compounds.
export function setAnchorMap(map: AnchorMap | undefined): void {
  activeAnchorMap = map;
}

 * Register Handlebars helpers for template rendering.
export function registerHelpers(options: Pick<MoxygenOptions, 'anchors' | 'htmlAnchors'>): void {
  const synthesizedMemberSummary = (member: Record<string, unknown>): string => {
    const summary = typeof member.summary === 'string' ? member.summary.trim() : '';
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
    code.replace(/\|/g, '\\|').replace(/\n/g, '<br/>'),
  );

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
    const member = this as Record<string, unknown>;
    const kind = member.kind as string;

    if (kind === 'enum') {
      return `enum ${member.name}`;
    }
    if (kind === 'variable') {
      const init = member.initializer as string;
      return init
        ? `${stripMarkdownLinks(member.returnType as string)} ${member.name} ${init}`
        : `${stripMarkdownLinks(member.returnType as string)} ${member.name}`;
    }
    if (kind === 'property') {
      return `${stripMarkdownLinks(member.returnType as string)} ${member.name}`;
    }

    // function/signal/slot
    const parts: string[] = [];
    const tparams = member.templateParams as Array<{ type: string; name: string }>;
    if (tparams && tparams.length > 0) {
      parts.push('template<' + tparams.map(tp => {
        const type = stripMarkdownLinks(tp.type);
        return tp.name ? `${type} ${tp.name}` : type;
      }).join(', ') + '>');
    }
    if (member.isVirtual) parts.push('virtual');
    if (member.isStatic) parts.push('static');
    if (member.isInline) parts.push('inline');
    if (member.isExplicit) parts.push('explicit');
    const rt = member.returnType as string;
    if (rt) parts.push(stripMarkdownLinks(rt));
    const params = member.params as Array<{ type: string; name: string }>;
    const paramStr = params
      ? params.map((p) => {
        const type = stripMarkdownLinks(p.type);
        return p.name ? `${type} ${p.name}` : type;
      }).join(', ')
      : '';
    parts.push(`${member.name}(${paramStr})`);
    const qualifiers = member.qualifiers as string[];
    if (qualifiers) {
      for (const q of qualifiers) parts.push(q);
    }
    return parts.join(' ');
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
  Handlebars.registerHelper('returnTypeShort', function (this: Record<string, unknown>) {
    const rt = (this.returnType as string) || '';
    const clean = rt.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim();
    return clean ? `\`${clean}\`` : '';
  });

  // Linked name: renders as markdown link if refid exists
  Handlebars.registerHelper('linkedName', (name: string, refid: string) => {
    const short = (name || '').split('::').pop() || name;
    if (refid) return `[\`${short}\`]({#ref ${refid} #})`;
    return `\`${short}\``;
  });

  // Not helper for conditionals
  Handlebars.registerHelper('not', (value: unknown) => !value);

  // Whether a section should show the return/type column
  Handlebars.registerHelper('hasReturnColumn', (section: string) => {
    const noReturn = new Set(['enum', 'define', 'public-type']);
    return !noReturn.has(section);
  });
}

 * Load all .md templates from the given directory.
export function load(templateDirectory: string): void {
  for (const filename of readdirSync(templateDirectory)) {
    const fullpath = join(templateDirectory, filename);
    const match = filename.match(/(.*)\.md$/);
    if (!match) continue;

    const content = readFileSync(fullpath, 'utf8');
    templates[match[1]] = Handlebars.compile(content, {
      noEscape: true,
      strict: true,
    });
  }
}

 * Render a single compound using the appropriate template.
export function render(compound: Compound): string | undefined {
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
    case 'interface':
    case 'enum':
      templateName = 'class';
      break;
    default:
      log.warn(`Cannot render ${compound.kind} ${compound.fullname}`);
      return undefined;
  }

  if (!templates[templateName]) {
    throw new Error(`Template "${templateName}" not found in your templates directory.`);
  }

  return templates[templateName](compound).replace(/(\r\n|\r|\n){3,}/g, '$1\n');
}

 * Render an array of compounds.
export function renderArray(compounds: Compound[]): (string | undefined)[] {
  return compounds.map((c) => render(c));
}
