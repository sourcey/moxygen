/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 */

import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toArray, toFilteredArray, filterChildren } from './compound.js';
import { writeCompound, renderCompound, compoundPath, writeFile } from './helpers.js';
import { log } from './logger.js';
import { loadIndex } from './parser.js';
import * as templates from './templates.js';
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
  /** Output slug derived from compound name (e.g. "PacketStream", "base") */
  slug: string;
  /** Display title */
  title: string;
  /** Compound kind: "class", "struct", "namespace", "group", "page", "index", "enum" */
  kind: string;
  /** Module/group name if available */
  module?: string;
  /** C++ namespace */
  namespace?: string;
  /** Header file (from Doxygen) */
  header?: string;
  /** Brief description */
  description: string;
  /** Rendered markdown content */
  markdown: string;
  /** The underlying compound (for advanced consumers) */
  compound: Compound;
}

// ---------------------------------------------------------------------------
// generate() — library API returning structured pages
// ---------------------------------------------------------------------------

/**
 * Parse Doxygen XML and return structured pages with rendered markdown.
 * This is the primary library API for consumers like Sourcey.
 */
export async function generate(
  options: Partial<MoxygenOptions> & { directory: string },
): Promise<GeneratedPage[]> {
  const opts = resolveOptions({ ...options, classes: true, anchors: true });
  const { root, references } = await loadAndPrepare(opts);
  const pages: GeneratedPage[] = [];

  // Per-class output: one page per class/struct/enum, plus namespace index pages
  const rootCompounds = toArray(root, 'compounds', 'namespace') as Compound[];

  for (const comp of rootCompounds) {
    filterChildren(comp, opts.filters);

    // Namespace index page
    const nsMarkdown = templates.render(comp);
    if (nsMarkdown) {
      pages.push(compoundToPage(comp, nsMarkdown, references, opts));
    }

    // Each class/struct/enum within the namespace
    const compounds = toFilteredArray(comp);
    for (const child of compounds) {
      filterChildren(child, opts.filters);
      const childMarkdown = templates.render(child);
      if (childMarkdown) {
        pages.push(compoundToPage(child, childMarkdown, references, opts));
      }
    }
  }

  // Doxygen pages (if any)
  const doxyPages = toArray(root, 'compounds', 'page') as Compound[];
  for (const page of doxyPages) {
    const pageCompounds = toFilteredArray(page, 'compounds');
    pageCompounds.unshift(page);
    const content = templates.renderArray(pageCompounds);
    const markdown = renderCompound(page, content, references, opts);
    if (markdown) {
      pages.push({
        slug: page.name,
        title: shortname(page.name),
        kind: 'page',
        description: page.briefdescription || '',
        markdown,
        compound: page,
      });
    }
  }

  return pages;
}

function compoundToPage(
  compound: Compound,
  renderedMarkdown: string,
  references: References,
  options: MoxygenOptions,
): GeneratedPage {
  const body = renderCompound(compound, [renderedMarkdown], references, options);
  const ns = findNamespace(compound);
  const group = findGroup(compound);
  const title = shortname(compound.name);
  const description = compound.briefdescription || '';
  const module = group?.name;
  const namespace = ns?.fullname;
  const header = compound.includes as string | undefined;

  const fm = generateFrontmatter({ title, description, kind: compound.kind, module, namespace, header });
  const markdown = fm + body;

  return {
    slug: slugify(compound.name),
    title,
    kind: compound.kind,
    module,
    namespace,
    header,
    description,
    markdown,
    compound,
  };
}

/**
 * Generate YAML frontmatter string from page metadata.
 */
export function generateFrontmatter(meta: {
  title: string;
  description?: string;
  kind?: string;
  module?: string;
  namespace?: string;
  header?: string;
}): string {
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

function writeCompoundWithFrontmatter(
  compound: Compound,
  contents: (string | undefined)[],
  references: References,
  options: MoxygenOptions,
): void {
  if (options.frontmatter) {
    const filepath = compoundPath(compound, options);
    const body = renderCompound(compound, contents, references, options);
    const ns = findNamespace(compound);
    const group = findGroup(compound);
    const fm = generateFrontmatter({
      title: shortname(compound.name),
      description: compound.briefdescription || undefined,
      kind: compound.kind,
      module: group?.name,
      namespace: ns?.fullname,
      header: compound.includes as string | undefined,
    });
    writeFile(filepath, [fm, body]);
  } else {
    writeCompound(compound, contents, references, options);
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
// run() — CLI API writing to disk (unchanged behavior)
// ---------------------------------------------------------------------------

/**
 * Parse Doxygen XML and render Markdown output to disk.
 */
export async function run(options: Partial<MoxygenOptions> & { directory: string }): Promise<void> {
  const opts = resolveOptions(options);
  const { root, references } = await loadAndPrepare(opts);

  // Output groups
  if (opts.groups) {
    const groups = toArray(root, 'compounds', 'group') as Compound[];
    if (!groups.length) {
      throw new Error(
        'You have enabled `groups` output, but no groups were located in your doxygen XML files.',
      );
    }

    for (const group of groups) {
      filterChildren(group, opts.filters, group.id);
      const compounds = toFilteredArray(group, 'compounds');
      compounds.unshift(group);
      writeCompound(group, templates.renderArray(compounds), references, opts);
    }
  } else if (opts.classes) {
    const rootCompounds = toArray(root, 'compounds', 'namespace') as Compound[];
    if (!rootCompounds.length) {
      throw new Error(
        'You have enabled `classes` output, but no classes were located in your doxygen XML files.',
      );
    }

    for (const comp of rootCompounds) {
      filterChildren(comp, opts.filters);
      const compounds = toFilteredArray(comp);
      writeCompoundWithFrontmatter(comp, [templates.render(comp)], references, opts);
      for (const e of compounds) {
        filterChildren(e, opts.filters);
        writeCompoundWithFrontmatter(e, [templates.render(e)], references, opts);
      }
    }
  } else {
    // Single file output
    filterChildren(root, opts.filters);
    const compounds = toFilteredArray(root, 'compounds');
    if (!opts.noindex) {
      compounds.unshift(root);
    }
    const contents = templates.renderArray(compounds);
    contents.push('Generated by [Moxygen](https://sourcey.com/code/moxygen)');
    writeCompound(root, contents, references, opts);
  }

  // Pages
  if (opts.pages) {
    const doxyPages = toArray(root, 'compounds', 'page') as Compound[];
    if (!doxyPages.length) {
      throw new Error(
        'You have enabled `pages` output, but no pages were located in your doxygen XML files.',
      );
    }

    for (const page of doxyPages) {
      const compounds = toFilteredArray(page, 'compounds');
      compounds.unshift(page);
      writeCompound(page, templates.renderArray(compounds), references, opts);
    }
  }
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

export { loadIndex } from './parser.js';
export { filterChildren, toArray, toFilteredArray, createCompound, findCompound } from './compound.js';
export { renderCompound, resolveRefs, compoundPath, getAnchor, findParent } from './helpers.js';
export { render as renderTemplate, renderArray as renderTemplateArray, registerHelpers, load as loadTemplates } from './templates.js';
export type { MoxygenOptions, Compound, Member, References, Filters } from './types.js';
