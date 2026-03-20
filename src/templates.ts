/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Handlebars from 'handlebars';
import { getAnchor, cleanId } from './helpers.js';
import type { AnchorMap } from './helpers.js';
import { log } from './logger.js';
import type { Compound, MoxygenOptions } from './types.js';

const templates: Record<string, HandlebarsTemplateDelegate> = {};
let activeAnchorMap: AnchorMap | undefined;

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
export function registerHelpers(options: Pick<MoxygenOptions, 'anchors' | 'htmlAnchors'>): void {
  // Classic helpers
  Handlebars.registerHelper('cell', (code: string) =>
    code.replace(/\|/g, '\\|').replace(/\n/g, '<br/>'),
  );

  Handlebars.registerHelper('eq', (a: unknown, b: unknown) => a === b);

  Handlebars.registerHelper('or', (a: unknown, b: unknown) => a || b);

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
        ? `${member.returnType} ${member.name} ${init}`
        : `${member.returnType} ${member.name}`;
    }
    if (kind === 'property') {
      return `${member.returnType} ${member.name}`;
    }

    // function/signal/slot
    const parts: string[] = [];
    const tparams = member.templateParams as Array<{ type: string; name: string }>;
    if (tparams && tparams.length > 0) {
      parts.push('template<' + tparams.map(tp => tp.name ? `${tp.type} ${tp.name}` : tp.type).join(', ') + '>');
    }
    if (member.isVirtual) parts.push('virtual');
    if (member.isStatic) parts.push('static');
    if (member.isInline) parts.push('inline');
    if (member.isExplicit) parts.push('explicit');
    const rt = member.returnType as string;
    if (rt) parts.push(rt);
    const params = member.params as Array<{ type: string; name: string }>;
    const paramStr = params ? params.map(p => p.name ? `${p.type} ${p.name}` : p.type).join(', ') : '';
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
    return rt.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1').trim() || '';
  });

  // Linked name: renders as markdown link if refid exists
  Handlebars.registerHelper('linkedName', (name: string, refid: string) => {
    const short = (name || '').split('::').pop() || name;
    if (refid) return `[\`${short}\`]({#ref ${refid} #})`;
    return `\`${short}\``;
  });

  // Not helper for conditionals
  Handlebars.registerHelper('not', (value: unknown) => !value);
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
    templates[match[1]] = Handlebars.compile(content, {
      noEscape: true,
      strict: true,
    });
  }
}

/**
 * Render a single compound using the appropriate template.
 */
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

/**
 * Render an array of compounds.
 */
export function renderArray(compounds: Compound[]): (string | undefined)[] {
  return compounds.map((c) => render(c));
}
