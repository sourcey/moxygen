/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, format as formatPath } from 'node:path';
import { format as utilFormat } from 'node:util';
import { log } from './logger.js';
import type { Compound, Member, MoxygenOptions, References } from './types.js';

export type AnchorMap = Map<string, string>;

/**
 * Wrap code segments in backticks, preserving markdown links and line breaks.
 */
export function inline(code: string | string[]): string {
  if (!Array.isArray(code)) {
    return `\`${code}\``;
  }

  let s = '';
  let isInline = false;

  for (const segment of code) {
    const refs = segment.split(/(\[.*?\]\(.*?\)|\n|\s{2}\n)/g);

    for (const fragment of refs) {
      if (fragment.charAt(0) === '[') {
        const match = fragment.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          if (isInline) { s += '`'; isInline = false; }
          s += `[\`${match[1]}\`](${match[2]})`;
        }
      } else if (fragment === '\n' || fragment === '  \n') {
        if (isInline) { s += '`'; isInline = false; }
        s += fragment;
      } else if (fragment) {
        if (!isInline) { s += '`'; isInline = true; }
        s += fragment;
      }
    }
  }

  return s + (isInline ? '`' : '');
}

/**
 * Generate an anchor string based on options.
 */
export function getAnchor(name: string, options: Pick<MoxygenOptions, 'anchors' | 'htmlAnchors'>): string {
  if (options.anchors) {
    return `{#${name}}`;
  }
  if (options.htmlAnchors) {
    return `<a id="${name}"></a>`;
  }
  return '';
}

/**
 * Find the nearest parent compound matching one of the given kinds.
 */
export function findParent(compound: Compound | Member | undefined, kinds: string[]): Compound | undefined {
  let current = compound as Compound | undefined;
  while (current) {
    if (kinds.includes(current.kind)) return current;
    current = current.parent as Compound | undefined;
  }
  return undefined;
}

/**
 * Convert a name to a clean URL-safe anchor ID.
 */
export function cleanId(name: string): string {
  return name
    .toLowerCase()
    .replace(/::/g, '-')
    .replace(/[^a-z0-9_-]/g, '')
    .replace(/^-+|-+$/g, '') || 'unknown';
}

/**
 * Build a map from Doxygen refids to clean, human-readable anchor IDs.
 * Handles deduplication for overloaded names.
 */
export function buildCleanAnchorMap(compounds: Compound[]): AnchorMap {
  const map = new Map<string, string>();
  const used = new Set<string>();

  function dedup(base: string): string {
    let id = base;
    let i = 1;
    while (used.has(id)) { id = `${base}-${i++}`; }
    used.add(id);
    return id;
  }

  for (const compound of compounds) {
    const compClean = dedup(cleanId(compound.shortname || compound.name));
    map.set(compound.refid, compClean);

    for (const member of compound.filtered?.members || []) {
      const memberClean = dedup(cleanId(member.name));
      map.set(member.refid, memberClean);
    }
  }

  return map;
}

/**
 * Resolve internal reference links to point to correct output files.
 */
export function resolveRefs(
  content: string,
  compound: Compound,
  references: References,
  options: MoxygenOptions,
  anchorMap?: AnchorMap,
): string {
  function anchor(refid: string): string {
    return anchorMap?.get(refid) ?? refid;
  }

  return content.replace(/\{#ref ([^ ]+) #\}/g, (_, refid: string) => {
    const ref = references[refid];
    if (!ref) return `#${anchor(refid)}`;

    const page = findParent(ref, ['page']);

    if (page) {
      if (page.refid === compound.refid) return `#${anchor(refid)}`;
      return `${compoundPath(page, options)}#${anchor(refid)}`;
    }

    if (options.groups) {
      if (compound.groupid && compound.groupid === (ref as Member).groupid) {
        return `#${anchor(refid)}`;
      }
      return `${compoundPath(ref as Compound, options)}#${anchor(refid)}`;
    }

    if (options.classes) {
      const dest = findParent(ref, ['namespace', 'class', 'struct']);
      if (!dest || compound.refid === dest.refid) return `#${anchor(refid)}`;
      return `${compoundPath(dest, options)}#${anchor(refid)}`;
    }

    if (compound.kind === 'page') {
      return `${compoundPath(compound.parent as Compound, options)}#${anchor(refid)}`;
    }

    return `#${anchor(refid)}`;
  });
}

/**
 * Calculate the output file path for a compound.
 */
export function compoundPath(compound: Compound, options: MoxygenOptions): string {
  if (compound.kind === 'page') {
    return `${dirname(options.output)}/page-${compound.name}.md`;
  }
  if (options.groups) {
    return utilFormat(options.output, compound.groupname);
  }
  if (options.classes) {
    return utilFormat(
      options.output,
      compound.name.replace(/:/g, '-').replace('<', '(').replace('>', ')'),
    );
  }
  return options.output;
}

/**
 * Render a compound's contents to a string, resolving refs.
 */
export function renderCompound(
  compound: Compound,
  contents: (string | undefined)[],
  references: References,
  options: MoxygenOptions,
  anchorMap?: AnchorMap,
): string {
  const resolved = contents.map((content) =>
    content ? resolveRefs(content, compound, references, options, anchorMap) : '',
  );
  return resolved.filter(Boolean).join('');
}

/**
 * Write a compound's rendered contents to file, resolving refs first.
 */
export function writeCompound(
  compound: Compound,
  contents: (string | undefined)[],
  references: References,
  options: MoxygenOptions,
  anchorMap?: AnchorMap,
): void {
  const filepath = compoundPath(compound, options);
  const output = renderCompound(compound, contents, references, options, anchorMap);
  writeFile(filepath, [output]);
}

/**
 * Write content array to a file.
 */
export function writeFile(filepath: string, contents: string[]): void {
  log.verbose(`Writing: ${filepath}`);
  mkdirSync(dirname(filepath), { recursive: true });
  const output = contents.filter(Boolean).join('');
  writeFileSync(filepath, output, 'utf8');
}
