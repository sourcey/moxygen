/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toArray, toFilteredArray, filterChildren, filterNoise, groupMembersBySection } from './compound.js';
import { writeCompound, renderCompound, compoundPath, writeFile, buildCleanAnchorMap } from './helpers.js';
import type { AnchorMap } from './helpers.js';
import { log } from './logger.js';
import { loadIndex } from './parser.js';
import * as templates from './templates.js';
import { setAnchorMap } from './templates.js';
import type { Compound, Filters, MoxygenOptions, References } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const defaultFilters: Filters = {
  members: [
    'define',
    'enum',
    'func',
    'var',
    'property',
    'public-attrib',
    'public-func',
    'public-static-attrib',
    'public-static-func',
    'protected-attrib',
    'protected-func',
    'signal',
    'public-slot',
    'protected-slot',
    'public-type',
    'private-attrib',
    'private-func',
    'private-slot',
    'private-static-func',
  ],
  compounds: [
    'namespace',
    'class',
    'struct',
    'union',
    'typedef',
    'interface',
    'enum',
  ],
};

export const defaultOptions: MoxygenOptions = {
  directory: '',
  output: 'api.md',
  groups: false,
  classes: false,
  pages: false,
  noindex: false,
  anchors: true,
  htmlAnchors: false,
  language: 'cpp',
  templates: 'templates',
  quiet: false,
  frontmatter: false,
  filters: defaultFilters,
};

// ---------------------------------------------------------------------------
// Shared setup
// ---------------------------------------------------------------------------

function resolveOptions(options: Partial<MoxygenOptions> & { directory: string }): MoxygenOptions {
  const opts: MoxygenOptions = { ...defaultOptions, ...options };

  if (!opts.filters) {
    opts.filters = defaultFilters;
  }

  if (!options.output) {
    opts.output = opts.classes || opts.groups
      ? 'api_%s.md'
      : 'api.md';
  }

  if ((opts.classes || opts.groups) && !opts.output.includes('%s')) {
    throw new Error(
      "The `output` file parameter must contain '%s' for group or class name " +
      'substitution when `groups` or `classes` are enabled.',
    );
  }

  if (!options.templates) {
    opts.templates = join(__dirname, '..', 'templates', opts.language);
  }

  return opts;
}

async function loadAndPrepare(opts: MoxygenOptions): Promise<{ root: Compound; references: References }> {
  log.init(opts);
  templates.registerHelpers(opts);
  templates.load(opts.templates);
  return loadIndex(opts);
}

// ---------------------------------------------------------------------------
// Generated page type (for library consumers)
// ---------------------------------------------------------------------------

export interface GeneratedPage {
  slug: string;
  title: string;
  kind: string;
  module?: string;
  namespace?: string;
  header?: string;
  description: string;
  /** Rendered markdown body (no frontmatter; use metadata fields directly) */
  markdown: string;
}

// ---------------------------------------------------------------------------
// Compound metadata extraction (shared by generate + run)
// ---------------------------------------------------------------------------

interface CompoundMeta {
  slug: string;
  title: string;
  kind: string;
  module?: string;
  namespace?: string;
  header?: string;
  description: string;
}

function extractMeta(compound: Compound): CompoundMeta {
  const ns = findNamespace(compound);
  const group = findGroup(compound);
  return {
    slug: slugify(compound.name),
    title: shortname(compound.name),
    kind: compound.kind,
    module: group?.name,
    namespace: ns?.fullname,
    header: compound.includes as string | undefined,
    description: compound.briefdescription || '',
  };
}

/**
 * Generate YAML frontmatter string from metadata.
 */
export function generateFrontmatter(meta: CompoundMeta): string {
  const lines = ['---'];
  lines.push(`title: "${meta.title}"`);
  if (meta.description) lines.push(`description: "${meta.description.replace(/"/g, '\\"')}"`);
  if (meta.kind) lines.push(`kind: ${meta.kind}`);
  if (meta.module) lines.push(`module: ${meta.module}`);
  if (meta.namespace) lines.push(`namespace: ${meta.namespace}`);
  if (meta.header) lines.push(`header: "${meta.header}"`);
  lines.push('---', '');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// generate() — library API returning structured pages (no disk I/O)
// ---------------------------------------------------------------------------

/**
 * Apply noise filtering and section grouping to a compound after filterChildren.
 */
function prepareCompound(compound: Compound): void {
  compound.filtered.members = filterNoise(compound.filtered.members);
  compound.filtered.sections = groupMembersBySection(compound);
}

/**
 * Parse Doxygen XML and return structured pages with rendered markdown.
 * Markdown is the body only; metadata is in the structured fields.
 */
export async function generate(
  options: Partial<MoxygenOptions> & { directory: string },
): Promise<GeneratedPage[]> {
  const opts = resolveOptions({ ...options, classes: true, anchors: true });
  const { root, references } = await loadAndPrepare(opts);
  const pages: GeneratedPage[] = [];

  const rootCompounds = toArray(root, 'compounds', 'namespace') as Compound[];

  // First pass: filter and prepare all compounds
  const allCompounds: Compound[] = [];
  for (const comp of rootCompounds) {
    filterChildren(comp, opts.filters);
    prepareCompound(comp);
    allCompounds.push(comp);

    for (const child of toFilteredArray(comp)) {
      filterChildren(child, opts.filters);
      prepareCompound(child);
      allCompounds.push(child);
    }
  }

  // Build clean anchor map across all compounds
  const anchorMap = buildCleanAnchorMap(allCompounds);
  setAnchorMap(anchorMap);

  // Second pass: render
  for (const comp of rootCompounds) {
    const nsMarkdown = templates.render(comp);
    if (nsMarkdown) {
      const meta = extractMeta(comp);
      pages.push({ ...meta, markdown: renderCompound(comp, [nsMarkdown], references, opts, anchorMap) });
    }

    for (const child of toFilteredArray(comp)) {
      const childMarkdown = templates.render(child);
      if (childMarkdown) {
        const meta = extractMeta(child);
        pages.push({ ...meta, markdown: renderCompound(child, [childMarkdown], references, opts, anchorMap) });
      }
    }
  }

  // Doxygen @page entries
  for (const page of toArray(root, 'compounds', 'page') as Compound[]) {
    const pageCompounds = toFilteredArray(page, 'compounds');
    pageCompounds.unshift(page);
    const content = templates.renderArray(pageCompounds);
    const markdown = renderCompound(page, content, references, opts, anchorMap);
    if (markdown) {
      pages.push({
        slug: page.name,
        title: shortname(page.name),
        kind: 'page',
        description: page.briefdescription || '',
        markdown,
      });
    }
  }

  return pages;
}

// ---------------------------------------------------------------------------
// run() — CLI API writing to disk
// ---------------------------------------------------------------------------

/**
 * Parse Doxygen XML and render Markdown output to disk.
 */
export async function run(options: Partial<MoxygenOptions> & { directory: string }): Promise<void> {
  const opts = resolveOptions(options);
  const { root, references } = await loadAndPrepare(opts);

  // --- Pass 1: filter + prepare all compounds ---
  const allCompounds: Compound[] = [];

  if (opts.groups) {
    const groups = toArray(root, 'compounds', 'group') as Compound[];
    if (!groups.length) {
      throw new Error('You have enabled `groups` output, but no groups were located in your doxygen XML files.');
    }
    for (const group of groups) {
      filterChildren(group, opts.filters, group.id);
      prepareCompound(group);
      const children = toFilteredArray(group, 'compounds');
      for (const c of children) prepareCompound(c);
      allCompounds.push(group, ...children);
    }
  } else if (opts.classes) {
    const rootCompounds = toArray(root, 'compounds', 'namespace') as Compound[];
    if (!rootCompounds.length) {
      throw new Error('You have enabled `classes` output, but no classes were located in your doxygen XML files.');
    }
    for (const comp of rootCompounds) {
      filterChildren(comp, opts.filters);
      prepareCompound(comp);
      allCompounds.push(comp);
      for (const e of toFilteredArray(comp)) {
        filterChildren(e, opts.filters);
        prepareCompound(e);
        allCompounds.push(e);
      }
    }
  } else {
    filterChildren(root, opts.filters);
    prepareCompound(root);
    const children = toFilteredArray(root, 'compounds');
    for (const c of children) prepareCompound(c);
    allCompounds.push(root, ...children);
  }

  // --- Build anchor map once ---
  const anchorMap = buildCleanAnchorMap(allCompounds);
  setAnchorMap(anchorMap);

  // --- Pass 2: render + write ---
  if (opts.groups) {
    const groups = toArray(root, 'compounds', 'group') as Compound[];
    for (const group of groups) {
      const compounds = toFilteredArray(group, 'compounds');
      compounds.unshift(group);
      writeWithOptionalFrontmatter(group, templates.renderArray(compounds), references, opts, anchorMap);
    }
  } else if (opts.classes) {
    const rootCompounds = toArray(root, 'compounds', 'namespace') as Compound[];
    for (const comp of rootCompounds) {
      writeWithOptionalFrontmatter(comp, [templates.render(comp)], references, opts, anchorMap);
      for (const e of toFilteredArray(comp)) {
        writeWithOptionalFrontmatter(e, [templates.render(e)], references, opts, anchorMap);
      }
    }
  } else {
    const compounds = toFilteredArray(root, 'compounds');
    if (!opts.noindex) {
      compounds.unshift(root);
    }
    const contents = templates.renderArray(compounds);
    contents.push('Generated by [Moxygen](https://sourcey.com/code/moxygen)');
    writeCompound(root, contents, references, opts, anchorMap);
  }

  if (opts.pages) {
    const doxyPages = toArray(root, 'compounds', 'page') as Compound[];
    if (!doxyPages.length) {
      throw new Error('You have enabled `pages` output, but no pages were located in your doxygen XML files.');
    }
    for (const page of doxyPages) {
      const compounds = toFilteredArray(page, 'compounds');
      compounds.unshift(page);
      writeWithOptionalFrontmatter(page, templates.renderArray(compounds), references, opts, anchorMap);
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Write compound to disk, optionally prepending YAML frontmatter.
 * Works for all output modes (groups, classes, pages, single).
 */
function writeWithOptionalFrontmatter(
  compound: Compound,
  contents: (string | undefined)[],
  references: References,
  options: MoxygenOptions,
  anchorMap?: AnchorMap,
): void {
  if (options.frontmatter) {
    const filepath = compoundPath(compound, options);
    const body = renderCompound(compound, contents, references, options, anchorMap);
    const fm = generateFrontmatter(extractMeta(compound));
    writeFile(filepath, [fm, body]);
  } else {
    writeCompound(compound, contents, references, options, anchorMap);
  }
}

function findNamespace(compound: Compound): Compound | undefined {
  let current: Compound | null = compound.parent;
  while (current) {
    if (current.kind === 'namespace') return current;
    current = current.parent;
  }
  return undefined;
}

function findGroup(compound: Compound): Compound | undefined {
  let current: Compound | null = compound.parent;
  while (current) {
    if (current.kind === 'group') return current;
    current = current.parent;
  }
  return undefined;
}

function shortname(name: string): string {
  const parts = (name || '').split('::');
  return parts[parts.length - 1] || name;
}

function slugify(name: string): string {
  return name.replace(/::/g, '-').replace(/[<>]/g, '').replace(/\s+/g, '-');
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

export { loadIndex } from './parser.js';
export { filterChildren, toArray, toFilteredArray } from './compound.js';
export { renderCompound, resolveRefs, compoundPath } from './helpers.js';
export type { MoxygenOptions, Compound, Member, References, Filters } from './types.js';
