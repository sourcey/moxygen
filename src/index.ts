/**
 * Original work Copyright (c) 2016 Philippe FERDINAND
 * Modified work Copyright (c) 2016 Kam Low
 *
 * @license MIT
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toArray, toFilteredArray, filterChildren, filterNoise, groupMembersBySection } from './compound.js';
import { writeCompound, renderCompound, compoundPath, writeFile, buildCleanAnchorMap } from './helpers.js';
import type { AnchorMap, PagePathMap, SlugMap } from './helpers.js';
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
    'typedef',
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
    title: qualifiedTitle(compound),
    kind: compound.kind,
    module: group?.name,
    namespace: ns?.fullname,
    header: compound.includes as string | undefined,
    description: compound.briefdescription || firstSentence(compound.detaileddescription) || '',
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

const GROUP_MARKER_RE = /(?:@|\\)(?:addtogroup|ingroup)\s+([A-Za-z_][\w:-]*)/g;

function resolveSourcePath(location: string, options: MoxygenOptions): string | undefined {
  const candidates: string[] = [];
  const seen = new Set<string>();

  const pushCandidate = (candidate: string): void => {
    const resolved = resolve(candidate);
    if (seen.has(resolved)) return;
    seen.add(resolved);
    candidates.push(resolved);
  };

  if (isAbsolute(location)) {
    pushCandidate(location);
  } else {
    if (options.sourceRoot) {
      pushCandidate(join(options.sourceRoot, location));
    }

    pushCandidate(location);

    let current = resolve(options.directory);
    while (true) {
      pushCandidate(join(current, location));
      const parent = dirname(current);
      if (parent === current) break;
      current = parent;
    }
  }

  return candidates.find((candidate) => existsSync(candidate));
}

function readFileGroupTags(file: Compound, options: MoxygenOptions): string[] {
  if (Array.isArray(file.fileGroupTags)) {
    return file.fileGroupTags as string[];
  }

  const location = typeof file.location === 'string' ? file.location : '';
  if (!location) {
    file.fileGroupTags = [];
    return file.fileGroupTags as string[];
  }

  const sourcePath = resolveSourcePath(location, options);
  if (!sourcePath) {
    file.fileGroupTags = [];
    return file.fileGroupTags as string[];
  }

  const source = readFileSync(sourcePath, 'utf8');
  const tags = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = GROUP_MARKER_RE.exec(source)) !== null) {
    tags.add(match[1]);
  }

  file.fileGroupTags = [...tags];
  return file.fileGroupTags as string[];
}

function markCompoundGroup(group: Compound, compound: Compound): void {
  if (compound.groupid && compound.groupid !== group.id) return;

  compound.groupid = group.id;
  compound.groupname = group.name;

  for (const member of compound.members) {
    if (member.groupid && member.groupid !== group.id) continue;
    member.groupid = group.id;
    member.groupname = group.name;
  }

  for (const child of Object.values(compound.compounds)) {
    markCompoundGroup(group, child);
  }
}

function attachCompoundToGroup(group: Compound, compound: Compound): void {
  if (compound.groupid && compound.groupid !== group.id) return;
  group.compounds[compound.id] = compound;
  markCompoundGroup(group, compound);
}

function attachMemberToGroup(group: Compound, member: Compound['members'][number]): void {
  if (member.groupid && member.groupid !== group.id) return;
  member.groupid = group.id;
  member.groupname = group.name;
  if (!group.members.some((existing) => existing.refid === member.refid)) {
    group.members.push(member);
  }
}

function attachFileScopedNamespaceMembersToGroup(
  group: Compound,
  namespaceCompound: Compound,
  fileLocation: string,
): boolean {
  let attached = false;

  for (const member of namespaceCompound.members) {
    if (member.location === fileLocation) {
      attachMemberToGroup(group, member);
      attached = true;
    }
  }

  for (const child of Object.values(namespaceCompound.compounds)) {
    if (child.kind === 'namespace') {
      if (attachFileScopedNamespaceMembersToGroup(group, child, fileLocation)) {
        attached = true;
      }
    }
  }

  if (attached) {
    const refs = (group.fileScopedNamespaceRefs as string[] | undefined) ?? [];
    if (!refs.includes(namespaceCompound.refid)) {
      refs.push(namespaceCompound.refid);
    }
    group.fileScopedNamespaceRefs = refs;
  }

  return attached;
}

function isNestedCompound(compound: Compound): boolean {
  const parent = compound.parent;
  return !!parent && ['class', 'struct', 'union', 'interface'].includes(parent.kind);
}

function hasAncestorRefid(compound: Compound, refids: Set<string>): boolean {
  let current = compound.parent;
  while (current) {
    if (refids.has(current.refid)) {
      return true;
    }
    current = current.parent;
  }
  return false;
}

function pruneTopLevelGroupCompounds(group: Compound): void {
  const topLevelRefids = new Set(
    Object.values(group.compounds).map((compound) => compound.refid),
  );

  for (const [id, compound] of Object.entries(group.compounds)) {
    let current = compound.parent;
    while (current) {
      if (topLevelRefids.has(current.refid) && current.groupid === group.id) {
        delete group.compounds[id];
        break;
      }
      current = current.parent;
    }
  }
}

function collectSharedNamespaceRefs(files: Compound[], options: MoxygenOptions): Set<string> {
  const namespaceGroups = new Map<string, Set<string>>();

  for (const file of files) {
    const tags = readFileGroupTags(file, options);
    if (!tags.length) continue;

    for (const refid of (file.fileNamespaceRefs ?? [])) {
      let groups = namespaceGroups.get(refid);
      if (!groups) {
        groups = new Set<string>();
        namespaceGroups.set(refid, groups);
      }

      for (const tag of tags) {
        groups.add(tag);
      }
    }
  }

  const shared = new Set<string>();
  for (const [refid, groups] of namespaceGroups) {
    if (groups.size > 1) {
      shared.add(refid);
    }
  }
  return shared;
}

function augmentGroupsFromFiles(root: Compound, groups: Compound[], options: MoxygenOptions): void {
  const files = toArray(root, 'compounds', 'file') as Compound[];
  if (!files.length) return;
  const sharedNamespaceRefs = collectSharedNamespaceRefs(files, options);
  const compoundsByRefid = new Map<string, Compound>();
  for (const compound of toArray(root, 'compounds') as Compound[]) {
    compoundsByRefid.set(compound.refid, compound);
  }

  const groupsByName = new Map<string, Compound>();
  for (const group of groups) {
    groupsByName.set(group.name, group);
  }

  for (const file of files) {
    const tags = readFileGroupTags(file, options);
    if (!tags.length) continue;

    for (const tag of tags) {
      const group = groupsByName.get(tag);
      if (!group) continue;

      let namespaceRefs = (file.fileNamespaceRefs ?? []).filter((refid) => !sharedNamespaceRefs.has(refid));
      if (!namespaceRefs.length && !(file.fileCompoundRefs?.length || file.members.length)) {
        namespaceRefs = [...(file.fileNamespaceRefs ?? [])];
      }

      const attachedNamespaceRefs = new Set<string>();
      for (const refid of namespaceRefs) {
        const candidate = compoundsByRefid.get(refid);
        if (!candidate || isJunkCompound(candidate)) continue;
        attachCompoundToGroup(group, candidate);
        attachedNamespaceRefs.add(refid);
      }

      const fileLocation = typeof file.location === 'string' ? file.location : '';
      if (fileLocation) {
        for (const refid of (file.fileNamespaceRefs ?? [])) {
          if (!sharedNamespaceRefs.has(refid)) continue;
          const candidate = compoundsByRefid.get(refid);
          if (!candidate || candidate.kind !== 'namespace') continue;
          attachFileScopedNamespaceMembersToGroup(group, candidate, fileLocation);
        }
      }

      for (const refid of (file.fileCompoundRefs ?? [])) {
        const candidate = compoundsByRefid.get(refid);
        if (!candidate) continue;
        if (isJunkCompound(candidate) || isNestedCompound(candidate)) continue;
        if (hasAncestorRefid(candidate, attachedNamespaceRefs)) continue;
        attachCompoundToGroup(group, candidate);
      }

      for (const member of file.members) {
        attachMemberToGroup(group, member);
      }
    }
  }
}

function finalizeGroups(groups: Compound[], sharedNamespaceRefs: Set<string>): void {
  for (const group of groups) {
    const groupedTopLevelCompounds = Object.values(group.compounds)
      .filter((compound) => compound.groupid === group.id);

    if (groupedTopLevelCompounds.length > 1) {
      for (const compound of groupedTopLevelCompounds) {
        if (sharedNamespaceRefs.has(compound.refid)) {
          delete group.compounds[compound.id];
        }
      }
    }

    pruneTopLevelGroupCompounds(group);
  }
}

/**
 * Parse Doxygen XML and return structured pages with rendered markdown.
 * Markdown is the body only; metadata is in the structured fields.
 *
 * Uses Doxygen groups (@defgroup/@addtogroup) as the primary module
 * organization when available, falling back to namespaces.
 */
export async function generate(
  options: Partial<MoxygenOptions> & { directory: string },
): Promise<GeneratedPage[]> {
  const opts = resolveOptions({ ...options, classes: true, anchors: false, htmlAnchors: true });
  const { root, references } = await loadAndPrepare(opts);
  const pages: GeneratedPage[] = [];

  // Check if Doxygen groups exist (from @defgroup/@addtogroup)
  const groups = (toArray(root, 'compounds', 'group') as Compound[])
    .filter((g) => !isJunkCompound(g));
  const useGroups = groups.length > 0;

  // First pass: filter and prepare all compounds
  const allCompounds: Compound[] = [];

  if (useGroups) {
    const seenPrep = new Set<string>();
    augmentGroupsFromFiles(root, groups, opts);
    finalizeGroups(groups, collectSharedNamespaceRefs(toArray(root, 'compounds', 'file') as Compound[], opts));

    // Group-based: each @defgroup becomes a module
    for (const group of groups) {
      filterChildren(group, opts.filters, group.id);
      prepareCompound(group);
      allCompounds.push(group);
      seenPrep.add(group.refid);

      for (const child of toFilteredArray(group, 'compounds')) {
        if (isJunkCompound(child)) continue;
        filterChildren(child, opts.filters);
        prepareCompound(child);
        allCompounds.push(child);
        seenPrep.add(child.refid);
      }
    }

    // Also collect orphaned classes from namespaces not in any group
    const allNamespaces = (toArray(root, 'compounds', 'namespace') as Compound[])
      .filter((c) => !isJunkCompound(c));
    for (const ns of allNamespaces) {
      filterChildren(ns, opts.filters);
      for (const child of toFilteredArray(ns)) {
        if (seenPrep.has(child.refid) || isJunkCompound(child)) continue;
        filterChildren(child, opts.filters);
        prepareCompound(child);
        allCompounds.push(child);
        seenPrep.add(child.refid);
      }
    }
  } else {
    // Namespace-based fallback
    const rootCompounds = (toArray(root, 'compounds', 'namespace') as Compound[])
      .filter((c) => !isJunkCompound(c));

    for (const comp of rootCompounds) {
      filterChildren(comp, opts.filters);
      prepareCompound(comp);
      allCompounds.push(comp);

      for (const child of toFilteredArray(comp)) {
        if (isJunkCompound(child)) continue;
        filterChildren(child, opts.filters);
        prepareCompound(child);
        allCompounds.push(child);
      }
    }
  }

  // Build clean anchor map and slug map across all compounds
  const anchorMap = buildCleanAnchorMap(allCompounds);
  setAnchorMap(anchorMap);

  const slugMap: SlugMap = new Map();
  for (const c of allCompounds) {
    slugMap.set(c.refid, slugify(c.name));
  }

  // Second pass: render (dedup by refid)
  const seen = new Set<string>();

  function emitPage(compound: Compound, moduleName?: string): void {
    if (seen.has(compound.refid)) return;
    seen.add(compound.refid);
    if (isJunkCompound(compound)) return;

    const md = templates.render(compound);
    if (!md) return;

    if (compound.kind === 'group') {
      pages.push({
        slug: slugify(compound.name),
        title: compound.shortname || compound.name,
        kind: 'group',
        module: compound.name,
        description: compound.briefdescription || firstSentence(compound.detaileddescription) || '',
        markdown: renderCompound(compound, [md], references, opts, anchorMap, slugMap),
      });
    } else {
      const meta = extractMeta(compound);
      if (moduleName) meta.module = moduleName;
      pages.push({ ...meta, markdown: renderCompound(compound, [md], references, opts, anchorMap, slugMap) });
    }
  }

  if (useGroups) {
    for (const group of groups) {
      emitPage(group);
      for (const child of toFilteredArray(group, 'compounds')) {
        emitPage(child, group.name);
      }
    }

    // Emit orphaned classes (already prepared in first pass)
    const allNamespaces = (toArray(root, 'compounds', 'namespace') as Compound[])
      .filter((c) => !isJunkCompound(c));
    for (const ns of allNamespaces) {
      for (const child of toFilteredArray(ns)) {
        if (seen.has(child.refid) || isJunkCompound(child)) continue;
        const nsParts = ns.fullname.split('::');
        const inferredModule = nsParts.length > 1 ? nsParts[1] : nsParts[0];
        emitPage(child, inferredModule);
      }
    }
  } else {
    const rootCompounds = (toArray(root, 'compounds', 'namespace') as Compound[])
      .filter((c) => !isJunkCompound(c));

    for (const comp of rootCompounds) {
      emitPage(comp);
      for (const child of toFilteredArray(comp)) {
        emitPage(child);
      }
    }
  }

  // Doxygen @page entries (skip auto-generated ones from source READMEs)
  for (const page of toArray(root, 'compounds', 'page') as Compound[]) {
    if (isJunkPage(page)) continue;
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

  // Disambiguate: if multiple pages in the same module have the same title,
  // add the namespace qualifier to distinguish them
  const titleKey = (p: GeneratedPage) => `${p.module}|${p.title}`;
  const titleCounts = new Map<string, number>();
  for (const p of pages) {
    titleCounts.set(titleKey(p), (titleCounts.get(titleKey(p)) || 0) + 1);
  }
  for (const p of pages) {
    if ((titleCounts.get(titleKey(p)) || 0) > 1 && p.namespace) {
      const nsShort = lastSegment(p.namespace);
      if (nsShort && !p.title.includes('::')) {
        p.title = `${nsShort}::${p.title}`;
      }
    }
  }

  return pages;
}

function lastSegment(ns: string): string {
  const parts = ns.split('::');
  return parts[parts.length - 1] || ns;
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
  let pagePathMap: PagePathMap | undefined;

  // --- Pass 1: filter + prepare all compounds ---
  const allCompounds: Compound[] = [];

  if (opts.groups) {
    const groups = toArray(root, 'compounds', 'group') as Compound[];
    if (!groups.length) {
      throw new Error('You have enabled `groups` output, but no groups were located in your doxygen XML files.');
    }
    augmentGroupsFromFiles(root, groups, opts);
    finalizeGroups(groups, collectSharedNamespaceRefs(toArray(root, 'compounds', 'file') as Compound[], opts));
    for (const group of groups) {
      filterChildren(group, opts.filters, group.id);
      prepareCompound(group);
      const children = toFilteredArray(group, 'compounds');
      for (const c of children) prepareCompound(c);
      if (!pagePathMap) {
        pagePathMap = new Map<string, string>();
      }
      const pagePath = compoundPath(group, opts);
      if (!pagePathMap.has(group.refid)) {
        pagePathMap.set(group.refid, pagePath);
      }
      for (const child of children) {
        if (!pagePathMap.has(child.refid)) {
          pagePathMap.set(child.refid, pagePath);
        }
      }
      for (const refid of (group.fileScopedNamespaceRefs as string[] | undefined) ?? []) {
        if (!pagePathMap.has(refid)) {
          pagePathMap.set(refid, pagePath);
        }
      }
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
      writeWithOptionalFrontmatter(group, templates.renderArray(compounds), references, opts, anchorMap, pagePathMap);
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
  pagePathMap?: PagePathMap,
): void {
  if (options.frontmatter) {
    const filepath = compoundPath(compound, options);
    const body = renderCompound(compound, contents, references, options, anchorMap, undefined, pagePathMap);
    const fm = generateFrontmatter(extractMeta(compound));
    writeFile(filepath, [fm, body]);
  } else {
    writeCompound(compound, contents, references, options, anchorMap, pagePathMap);
  }
}

const JUNK_NAMESPACES = new Set(['std', 'detail', 'nlohmann']);
const JUNK_NAME_RE = /^@\d+$/;

/**
 * Skip compounds that produce junk documentation:
 * std namespace, anonymous groups (@123), deprecated pseudo-pages.
 */
function isJunkCompound(compound: Compound): boolean {
  const name = compound.name;
  if (JUNK_NAMESPACES.has(name)) return true;
  if (JUNK_NAME_RE.test(name)) return true;
  if (name === 'deprecated') return true;
  return false;
}

/**
 * Skip Doxygen pages auto-generated from source tree markdown files.
 */
function isJunkPage(page: Compound): boolean {
  return page.name.startsWith('md_') || page.name === 'deprecated';
}

function firstSentence(text: string): string {
  if (!text) return '';
  const clean = text.replace(/\n/g, ' ').trim();
  const match = clean.match(/^(.+?[.!?])\s/);
  return match ? match[1] : clean.slice(0, 120);
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

/**
 * Build a readable title for a compound.
 * Inner classes: "Device::AudioCapability"
 * Deep sub-namespace classes: "ws::ConnectionAdapter"
 * Top-level module classes: "Server" (icy::http::Server stays as Server)
 */
function qualifiedTitle(compound: Compound): string {
  const name = shortname(compound.name);

  // Inner class/struct: qualify with parent class name
  if (compound.parent && ['class', 'struct'].includes(compound.parent.kind)) {
    return `${shortname(compound.parent.name)}::${name}`;
  }

  // Sub-namespace: 4+ segments means it's nested deeper than the module level
  // e.g. icy::http::ws::ConnectionAdapter -> ws::ConnectionAdapter
  // but icy::http::Server (3 segments) stays as Server
  const parts = compound.fullname.split('::');
  if (parts.length >= 4) {
    return `${parts[parts.length - 2]}::${name}`;
  }

  return name;
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
