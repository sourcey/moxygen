import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toArray, toFilteredArray, filterChildren, filterCollection, filterNoise, groupMembersBySection } from './compound.js';
import { writeCompound, renderCompound, compoundPath, writeFile, buildCleanAnchorMap, safePathSegment, stripMarkdownLinks } from './helpers.js';
import type { AnchorMap, PagePathMap, SlugMap } from './helpers.js';
import { log } from './logger.js';
import { loadIndex } from './parser.js';
import * as templates from './templates.js';
import { setAnchorMap } from './templates.js';
import type { AllMemberEntry, Compound, Filters, InheritedMemberGroup, Member, MoxygenOptions, References } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

export const defaultFilters: Filters = {
  members: [
    'define',
    'enum',
    'typedef',
    'func',
    'friend',
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
    'private-static-attrib',
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
    'concept',
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
  titleSeparator: ' - ',
  quiet: false,
  frontmatter: false,
  filters: defaultFilters,
  inlineGroups: false,
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
  searchEntries?: GeneratedSearchEntry[];
  /** Rendered markdown body (no frontmatter; use metadata fields directly) */
  markdown: string;
}

export interface GeneratedSearchEntry {
  title: string;
  content: string;
  anchor?: string;
  category: string;
  symbolKind?: string;
  owner?: string;
  ownerKind?: string;
  namespace?: string;
  qualifiedName?: string;
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

function extractRawDescription(compound: Compound): string {
  return compound.briefdescription || firstSentence(compound.detaileddescription) || '';
}

function extractMeta(compound: Compound, description = extractRawDescription(compound)): CompoundMeta {
  const ns = findNamespace(compound);
  const group = findGroup(compound);
  const title = compound.kind === 'index' && !compound.name
    ? 'API Reference'
    : qualifiedTitle(compound);
  return {
    slug: slugify(compound.name),
    title,
    kind: compound.kind,
    module: group?.name,
    namespace: ns?.fullname || compound.namespace || undefined,
    header: compound.includes as string | undefined,
    description,
  };
}

function extractResolvedMeta(
  compound: Compound,
  references: References,
  options: MoxygenOptions,
  anchorMap?: AnchorMap,
  slugMap?: SlugMap,
  pagePathMap?: PagePathMap,
): CompoundMeta {
  const description = renderCompound(
    compound,
    [extractRawDescription(compound)],
    references,
    options,
    anchorMap,
    slugMap,
    pagePathMap,
  );
  return extractMeta(compound, description);
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

function memberOwnerName(compound: Compound): string {
  return compound.fullname || compound.name || qualifiedTitle(compound);
}

function collectOwnAllMemberEntries(compound: Compound): AllMemberEntry[] {
  const owner = memberOwnerName(compound);
  const members = compound.filtered?.members?.length ? compound.filtered.members : compound.members;
  return members.map((member) => ({
    name: member.name,
    kind: member.kind,
    refid: member.refid,
    owner,
    ownerRefid: compound.refid,
    inherited: false,
  }));
}

function collectInheritedMemberGroups(compound: Compound, references: References): InheritedMemberGroup[] {
  const seenBaseRefids = new Set<string>();
  const groups: InheritedMemberGroup[] = [];

  const visitBase = (baseRefid: string | undefined): void => {
    if (!baseRefid || seenBaseRefids.has(baseRefid)) return;
    seenBaseRefids.add(baseRefid);

    const base = references[baseRefid] as Compound | undefined;
    if (!base || !('members' in base)) return;

    const members = base.filtered?.members?.length ? base.filtered.members : base.members;
    if (members.length) {
      groups.push({
        name: memberOwnerName(base),
        refid: base.refid,
        members,
      });
    }

    for (const parent of base.basecompoundref ?? []) {
      visitBase(parent.refid);
    }
  };

  for (const base of compound.basecompoundref ?? []) {
    visitBase(base.refid);
  }

  return groups;
}

function attachRelationshipSummaries(compounds: Compound[], references: References): void {
  for (const compound of compounds) {
    compound.inheritedMemberGroups = collectInheritedMemberGroups(compound, references);
    const inheritedEntries = compound.inheritedMemberGroups.flatMap((group) =>
      group.members.map((member) => ({
        name: member.name,
        kind: member.kind,
        refid: member.refid,
        owner: group.name,
        ownerRefid: group.refid,
        inherited: true,
      })),
    );
    compound.allMembers = [...collectOwnAllMemberEntries(compound), ...inheritedEntries]
      .filter((entry) => entry.name && entry.refid);
  }
}

const DOXYGEN_COMMENT_RE = /\/\*\*[\s\S]*?\*\/|\/\*![\s\S]*?\*\/|(?:^[ \t]*(?:\/\/\/|\/\/!).*(?:\r?\n|$))+/gm;
const ADDTOGROUP_MARKER_RE = /(?:@|\\)addtogroup\s+([A-Za-z_][\w:-]*)/g;
const INGROUP_MARKER_RE = /(?:@|\\)ingroup\s+([A-Za-z_][\w:-]*)/g;
const FILE_MARKER_RE = /(?:@|\\)file(?:\s|$)/;

function addGroupMarkerTags(source: string, marker: RegExp, tags: Set<string>): void {
  marker.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = marker.exec(source)) !== null) {
    tags.add(match[1]);
  }
}

function collectSourceGroupTags(source: string): string[] {
  const tags = new Set<string>();
  DOXYGEN_COMMENT_RE.lastIndex = 0;

  let comment: RegExpExecArray | null;
  while ((comment = DOXYGEN_COMMENT_RE.exec(source)) !== null) {
    const text = comment[0];
    addGroupMarkerTags(text, ADDTOGROUP_MARKER_RE, tags);
    if (FILE_MARKER_RE.test(text)) {
      addGroupMarkerTags(text, INGROUP_MARKER_RE, tags);
    }
  }

  return [...tags];
}

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
  file.fileGroupTags = collectSourceGroupTags(source);
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
    const filters = groupAwareFilters(opts.filters);

    // Group-based: each @defgroup becomes a module
    for (const group of groups) {
      filterChildren(group, filters, group.id);
      prepareCompound(group);
      allCompounds.push(group);
      seenPrep.add(group.refid);

      for (const child of toFilteredArray(group, 'compounds')) {
        if (isJunkCompound(child)) continue;
        if (child.kind === 'group') {
          filterChildren(child, filters, child.id);
        } else {
          filterChildren(child, opts.filters);
        }
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
  const pagePathMap = useGroups ? buildGroupedPagePathMap(groups) : undefined;
  attachRelationshipSummaries(allCompounds, references);

  // Second pass: render (dedup by refid)
  const seen = new Set<string>();

  function emitPage(compound: Compound, moduleName?: string): void {
    if (seen.has(compound.refid)) return;
    seen.add(compound.refid);
    if (isJunkCompound(compound)) return;

    const md = templates.render(compound);
    if (!md) return;
    const meta = extractResolvedMeta(compound, references, opts, anchorMap, slugMap, pagePathMap);
    if (moduleName) meta.module = moduleName;

    if (compound.kind === 'group') {
      pages.push({
        ...meta,
        title: compound.shortname || compound.name,
        module: compound.name,
        searchEntries: collectSearchEntries(compound, opts.titleSeparator, anchorMap),
        markdown: renderCompound(compound, [md], references, opts, anchorMap, slugMap, pagePathMap),
      });
    } else {
      pages.push({
        ...meta,
        searchEntries: collectSearchEntries(compound, opts.titleSeparator, anchorMap),
        markdown: renderCompound(compound, [md], references, opts, anchorMap, slugMap, pagePathMap),
      });
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
    const meta = extractResolvedMeta(page, references, opts, anchorMap);
    if (markdown) {
      pages.push({
        slug: page.name,
        title: shortname(page.name),
        kind: 'page',
        description: meta.description,
        markdown,
      });
    }
  }

  disambiguateDuplicatePageTitles(pages);

  return pages;
}

function disambiguateDuplicatePageTitles(pages: GeneratedPage[]): void {
  const byModuleTitle = new Map<string, GeneratedPage[]>();

  for (const page of pages) {
    const key = `${page.module ?? ''}|${page.title}`;
    const matches = byModuleTitle.get(key) ?? [];
    matches.push(page);
    byModuleTitle.set(key, matches);
  }

  for (const matches of byModuleTitle.values()) {
    if (matches.length <= 1) continue;

    const labels = minimallyQualifiedTitles(matches);
    for (let i = 0; i < matches.length; i += 1) {
      matches[i].title = labels[i];
    }
  }
}

function minimallyQualifiedTitles(pages: GeneratedPage[]): string[] {
  const namespaces = pages.map((page) => namespaceParts(page.namespace));
  const commonPrefix = commonNamespacePrefixLength(namespaces);
  const suffixes = namespaces.map((parts) => parts.slice(commonPrefix));
  const maxDepth = Math.max(0, ...suffixes.map((parts) => parts.length));

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const labels = pages.map((page, index) => qualifyWithNamespaceSuffix(page.title, suffixes[index], depth));
    if (new Set(labels).size === labels.length) return labels;
  }

  return pages.map((page, index) => qualifyWithNamespaceSuffix(page.title, suffixes[index], maxDepth));
}

function namespaceParts(namespace: string | undefined): string[] {
  return (namespace ?? '').split('::').filter(Boolean);
}

function commonNamespacePrefixLength(namespaces: string[][]): number {
  if (!namespaces.length || namespaces.some((parts) => parts.length === 0)) return 0;

  let prefixLength = 0;
  while (namespaces.every((parts) => parts[prefixLength] && parts[prefixLength] === namespaces[0][prefixLength])) {
    prefixLength += 1;
  }

  return prefixLength;
}

function qualifyWithNamespaceSuffix(title: string, namespace: string[], depth: number): string {
  const qualifier = namespace.slice(Math.max(0, namespace.length - depth)).join('::');
  return qualifier ? `${qualifier}::${title}` : title;
}

function lastSegment(ns: string): string {
  const parts = ns.split('::');
  return parts[parts.length - 1] || ns;
}

function buildGroupedPagePathMap(groups: Compound[]): PagePathMap {
  const map: PagePathMap = new Map();

  for (const group of groups) {
    const groupPath = `${slugify(group.name)}.html`;
    map.set(group.refid, groupPath);

    const namespaces = toArray(group, 'compounds', 'namespace') as Compound[];
    for (const namespace of namespaces) {
      if (isJunkCompound(namespace)) continue;
      map.set(namespace.refid, groupPath);
    }

    for (const refid of (group.fileScopedNamespaceRefs as string[] | undefined) ?? []) {
      if (!map.has(refid)) {
        map.set(refid, groupPath);
      }
    }
  }

  return map;
}

function collectSearchEntries(compound: Compound, separator: string, anchorMap?: AnchorMap): GeneratedSearchEntry[] {
  const entries: GeneratedSearchEntry[] = [];
  const members = compound.filtered?.members?.length ? compound.filtered.members : compound.members;
  const ownerTitle = qualifiedTitle(compound);
  const owner = compound.fullname || compound.name || ownerTitle;
  const namespace = compound.namespace || findNamespace(compound)?.fullname;

  for (const member of members) {
    if (!member.refid || !member.name) continue;
    const qualifiedName = owner ? `${owner}::${member.name}` : member.name;
    const signature = typeof member.definition === 'string' && member.definition
      ? stripMarkdownLinks(member.definition)
      : stripMarkdownLinks(member.proto || member.name);
    const summary = stripMarkdownLinks(member.summary || member.briefdescription || '').replace(/\s+/g, ' ').trim();
    entries.push({
      title: `${member.name}`,
      content: [qualifiedName, ownerTitle, signature, summary].filter(Boolean).join(separator),
      anchor: anchorMap?.get(member.refid),
      category: searchCategoryForKind(member.kind),
      symbolKind: member.kind,
      owner,
      ownerKind: compound.kind,
      namespace,
      qualifiedName,
    });

    if (member.enumvalue?.length) {
      for (const value of member.enumvalue) {
        const enumQualifiedName = `${qualifiedName}::${value.name}`;
        entries.push({
          title: value.name,
          content: [enumQualifiedName, ownerTitle, member.name, stripMarkdownLinks(value.summary || value.briefdescription || '')]
            .filter(Boolean)
            .join(separator),
          anchor: anchorMap?.get(member.refid),
          category: 'Enum Values',
          symbolKind: 'enumvalue',
          owner: qualifiedName,
          ownerKind: 'enum',
          namespace,
          qualifiedName: enumQualifiedName,
        });
      }
    }
  }

  return entries;
}

function searchCategoryForKind(kind: string): string {
  switch (kind) {
    case 'function':
    case 'signal':
    case 'slot':
      return 'Functions';
    case 'typedef':
      return 'Types';
    case 'enum':
      return 'Enums';
    case 'variable':
      return 'Variables';
    case 'friend':
      return 'Friends';
    case 'property':
      return 'Properties';
    case 'define':
      return 'Macros';
    default:
      return 'Members';
  }
}

// ---------------------------------------------------------------------------
// run() — CLI API writing to disk
// ---------------------------------------------------------------------------

const CLASS_OUTPUT_KINDS = new Set(['namespace', 'class', 'struct', 'union', 'interface', 'enum', 'concept']);

function groupAwareFilters(filters: Filters): Filters {
  return {
    ...filters,
    compounds: [...new Set(['group', ...filters.compounds])],
  };
}

function isClassOutputCompound(compound: Compound): boolean {
  return CLASS_OUTPUT_KINDS.has(compound.kind) && !isJunkCompound(compound);
}

function uniqueCompounds(compounds: Compound[]): Compound[] {
  const seen = new Set<string>();
  const result: Compound[] = [];
  for (const compound of compounds) {
    if (seen.has(compound.refid)) continue;
    seen.add(compound.refid);
    result.push(compound);
  }
  return result;
}

function collectClassOutputCompounds(root: Compound): Compound[] {
  return uniqueCompounds(
    (toArray(root, 'compounds') as Compound[]).filter(isClassOutputCompound),
  );
}

function collectRootIndexCompounds(root: Compound, groups: Compound[]): Compound[] {
  const topLevelGroups = groups.filter((group) => group.parent?.kind !== 'group');
  const rootCompounds = Object.values(root.compounds)
    .filter((compound) => isClassOutputCompound(compound) && !compound.groupid);
  return uniqueCompounds([...topLevelGroups, ...rootCompounds]);
}

function prepareRootIndex(root: Compound, groups: Compound[], opts: MoxygenOptions): void {
  root.filtered.members = filterNoise(
    filterCollection(root.members, 'section', opts.filters.members) as Member[],
  );
  root.filtered.compounds = collectRootIndexCompounds(root, groups);
  root.filtered.sections = groupMembersBySection(root);
}

function ensurePathMap(pagePathMap: PagePathMap | undefined): PagePathMap {
  return pagePathMap ?? new Map<string, string>();
}

function addCompoundPath(pagePathMap: PagePathMap, compound: Compound, opts: MoxygenOptions): void {
  if (!pagePathMap.has(compound.refid)) {
    pagePathMap.set(compound.refid, compoundPath(compound, opts));
  }
}

/**
 * Parse Doxygen XML and render Markdown output to disk.
 */
export async function run(options: Partial<MoxygenOptions> & { directory: string }): Promise<void> {
  const opts = resolveOptions(options);
  const { root, references } = await loadAndPrepare(opts);
  let pagePathMap: PagePathMap | undefined;
  const splitOutput = opts.groups || opts.classes;

  // --- Pass 1: filter + prepare all compounds ---
  const allCompounds: Compound[] = [];
  let writeRootIndex = false;
  let rootBodyCompounds: Compound[] = [];
  let groups: Compound[] = [];
  let classOutputCompounds: Compound[] = [];

  if (opts.groups) {
    groups = (toArray(root, 'compounds', 'group') as Compound[])
      .filter((group) => !isJunkCompound(group));
    if (!groups.length) {
      throw new Error('You have enabled `groups` output, but no groups were located in your doxygen XML files.');
    }
    augmentGroupsFromFiles(root, groups, opts);
    finalizeGroups(groups, collectSharedNamespaceRefs(toArray(root, 'compounds', 'file') as Compound[], opts));
  }

  if (opts.classes) {
    classOutputCompounds = collectClassOutputCompounds(root);
    if (!classOutputCompounds.length) {
      throw new Error('You have enabled `classes` output, but no classes were located in your doxygen XML files.');
    }
  }

  if (opts.groups) {
    const filters = groupAwareFilters(opts.filters);
    for (const group of groups) {
      filterChildren(group, filters, group.id);
      prepareCompound(group);
      const children = toFilteredArray(group, 'compounds');
      for (const c of children) prepareCompound(c);
      pagePathMap = ensurePathMap(pagePathMap);
      addCompoundPath(pagePathMap, group, opts);
      for (const child of children) {
        if (child.kind === 'group') {
          addCompoundPath(pagePathMap, child, opts);
        } else if (!opts.classes) {
          pagePathMap.set(child.refid, compoundPath(group, opts));
        }
      }
      for (const refid of (group.fileScopedNamespaceRefs as string[] | undefined) ?? []) {
        if (!pagePathMap.has(refid)) {
          pagePathMap.set(refid, compoundPath(group, opts));
        }
      }
      allCompounds.push(group, ...children);
    }
  }

  if (opts.classes) {
    for (const comp of classOutputCompounds) {
      filterChildren(comp, opts.filters);
      prepareCompound(comp);
      allCompounds.push(comp);
      pagePathMap = ensurePathMap(pagePathMap);
      addCompoundPath(pagePathMap, comp, opts);
    }
  }

  if (splitOutput) {
    prepareRootIndex(root, groups, opts);
    rootBodyCompounds = opts.classes
      ? []
      : root.filtered.compounds.filter((compound) => compound.kind !== 'group');
    writeRootIndex = !opts.noindex && (
      root.filtered.members.length > 0 ||
      root.filtered.compounds.length > 0
    );
    if (writeRootIndex) {
      pagePathMap = ensurePathMap(pagePathMap);
      const pagePath = compoundPath(root, opts);
      pagePathMap.set(root.refid, pagePath);
      for (const member of root.filtered.members) {
        pagePathMap.set(member.refid, pagePath);
      }
      if (!opts.classes) {
        for (const compound of rootBodyCompounds) {
          pagePathMap.set(compound.refid, pagePath);
        }
      }
      allCompounds.push(root);
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
  attachRelationshipSummaries(allCompounds, references);

  // --- Pass 2: render + write ---
  if (splitOutput) {
    if (writeRootIndex) {
      const contents = templates.renderArray([root, ...rootBodyCompounds]);
      contents.push('Generated by [Moxygen](https://0state.com/moxygen)');
      writeWithOptionalFrontmatter(root, contents, references, opts, anchorMap, pagePathMap);
    }

    if (opts.groups) {
      for (const group of groups) {
        const compounds = toFilteredArray(group, 'compounds')
          .filter((compound) => compound.kind !== 'group' && !opts.classes && compound.groupid === group.id);
        compounds.unshift(group);
        writeWithOptionalFrontmatter(group, templates.renderArray(compounds), references, opts, anchorMap, pagePathMap);
      }
    }

    if (opts.classes) {
      for (const comp of classOutputCompounds) {
        writeWithOptionalFrontmatter(comp, [templates.render(comp)], references, opts, anchorMap, pagePathMap);
      }
    }
  } else {
    const compounds = toFilteredArray(root, 'compounds');
    if (opts.inlineGroups) {
      const groups = (toArray(root, 'compounds', 'group') as Compound[])
        .filter((g) => !isJunkCompound(g));
      if (groups.length) {
        augmentGroupsFromFiles(root, groups, opts);
        finalizeGroups(groups, collectSharedNamespaceRefs(toArray(root, 'compounds', 'file') as Compound[], opts));
        const filters = groupAwareFilters(opts.filters);
        for (const group of groups) {
          filterChildren(group, filters, group.id);
          prepareCompound(group);
          const childCompounds = toFilteredArray(group, 'compounds')
            .filter((compound) => compound.kind !== 'group' && compound.groupid === group.id);
          for (const c of childCompounds) prepareCompound(c);
          compounds.push(group, ...childCompounds);
        }
      }
    }
    if (!opts.noindex) {
      compounds.unshift(root);
    }
    const contents = templates.renderArray(compounds);
    contents.push('Generated by [Moxygen](https://0state.com/moxygen)');
    writeWithOptionalFrontmatter(root, contents, references, opts, anchorMap);
  }

  if (opts.pages) {
    const doxyPages = toArray(root, 'compounds', 'page') as Compound[];
    if (!doxyPages.length) {
      throw new Error('You have enabled `pages` output, but no pages were located in your doxygen XML files.');
    }
    for (const page of doxyPages) {
      const compounds = toFilteredArray(page, 'compounds');
      compounds.unshift(page);
      writeWithOptionalFrontmatter(page, templates.renderArray(compounds), references, opts, anchorMap, pagePathMap);
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
    const fm = generateFrontmatter(
      extractResolvedMeta(compound, references, options, anchorMap, undefined, pagePathMap),
    );
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
  return safePathSegment(name);
}

// ---------------------------------------------------------------------------
// Public exports
// ---------------------------------------------------------------------------

export { loadIndex } from './parser.js';
export { filterChildren, toArray, toFilteredArray } from './compound.js';
export { renderCompound, resolveRefs, compoundPath } from './helpers.js';
export type { MoxygenOptions, Compound, Member, References, Filters } from './types.js';
