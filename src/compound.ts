import type { Compound, Filters, Member, SectionGroup } from './types.js';
import { sectionLabel } from './vocabulary.js';

export function createCompound(
  parent: Compound | null = null,
  id = '',
  name = '',
): Compound {
  return {
    parent,
    id,
    name,
    kind: '',
    refid: '',
    fullname: '',
    shortname: '',
    compounds: {},
    members: [],
    basecompoundref: [],
    derivedcompoundref: [],
    inheritedMemberGroups: [],
    allMembers: [],
    filtered: { compounds: [], members: [], sections: [] },
    briefdescription: '',
    detaileddescription: '',
    summary: '',
    namespace: '',
    templateParams: [],
  };
}

export function findCompound(
  root: Compound,
  id: string,
  name: string,
  create: boolean,
): Compound | undefined {
  let compound = root.compounds[id];
  if (!compound && create) {
    compound = createCompound(root, id, name);
    root.compounds[id] = compound;
  }
  return compound;
}

/**
 * Recursively collect compounds (and optionally filter by kind) into a flat array.
 */
export function toArray(
  compound: Compound,
  type: 'compounds' | 'members' = 'compounds',
  kind?: string,
): (Compound | Member)[] {
  if (type === 'members') {
    return [...compound.members];
  }

  const entries = Object.values(compound.compounds);
  const result: Compound[] = [];

  for (const child of entries) {
    if (!kind || child.kind === kind) {
      result.push(child);
      result.push(...(toArray(child, type, kind) as Compound[]));
    }
  }

  return result;
}

/**
 * Recursively collect filtered compounds into a flat array.
 */
export function toFilteredArray(
  compound: Compound,
  type: 'compounds' | 'members' = 'compounds',
): Compound[] {
  const items = (type === 'compounds'
    ? compound.filtered.compounds
    : []) as Compound[];
  const result: Compound[] = [];

  for (const item of items) {
    result.push(item);
    result.push(...toFilteredArray(item, type));
  }

  return result;
}

/**
 * Filter a collection by a key matching allowed categories, optionally scoped to a group.
 */
export function filterCollection(
  collection: Record<string, Compound | Member> | (Compound | Member)[],
  key: string,
  allowedCategories: string[],
  groupid?: string,
): (Compound | Member)[] {
  const categories: Record<string, (Compound | Member)[]> = {};

  const items = Array.isArray(collection)
    ? collection
    : Object.values(collection);

  for (const item of items) {
    if (!item) continue;

    // Skip empty namespaces
    if (
      'filtered' in item &&
      (item as Compound).kind === 'namespace'
    ) {
      const c = item as Compound;
      if (
        (!c.filtered.compounds || c.filtered.compounds.length === 0) &&
        (!c.filtered.members || c.filtered.members.length === 0)
      ) {
        continue;
      }
    }

    // Skip items not belonging to current group. Nested groups own their
    // own groupid, but still belong in the parent group's topic list.
    if (groupid) {
      if ('filtered' in item) {
        const compound = item as Compound;
        const parent = compound.parent as Compound | null;
        if (compound.groupid !== groupid && !(compound.kind === 'group' && parent?.id === groupid)) {
          continue;
        }
      } else if ((item as Member).groupid !== groupid) {
        continue;
      }
    }

    const categoryKey = (item as Record<string, unknown>)[key] as string;
    if (!categories[categoryKey]) {
      categories[categoryKey] = [];
    }
    categories[categoryKey].push(item);
  }

  const result: (Compound | Member)[] = [];
  for (const category of allowedCategories) {
    if (categories[category]) {
      result.push(...categories[category]);
    }
  }

  return result;
}

/**
 * Apply filters recursively to a compound and all its children.
 */
export function filterChildren(
  compound: Compound,
  filters: Filters,
  groupid?: string,
): void {
  const allCompounds = toArray(compound, 'compounds') as Compound[];

  for (const child of allCompounds) {
    child.filtered.members = filterCollection(
      child.members,
      'section',
      filters.members,
      groupid,
    ) as Member[];
    child.filtered.compounds = filterCollection(
      child.compounds,
      'kind',
      filters.compounds,
      groupid,
    ) as Compound[];
  }

  compound.filtered.members = filterCollection(
    compound.members,
    'section',
    filters.members,
    groupid,
  ) as Member[];
  compound.filtered.compounds = filterCollection(
    compound.compounds,
    'kind',
    filters.compounds,
    groupid,
  ) as Compound[];
}


const NOISE_RE = /^(TYPE|BREAK|DEG|SEP|IMPL)_\d+$/;

/**
 * Remove members that are structurally noise rather than API: internal macros
 * left behind by expansion.
 *
 * Missing documentation is deliberately not a signal. Doxygen only emits a
 * member when the project asked for it, either by documenting it, by placing
 * it in a documented group, or by setting `EXTRACT_ALL`. Include guards are
 * dropped by Doxygen itself and never reach this point.
 */
export function filterNoise(members: Member[]): Member[] {
  return members.filter((m) => !NOISE_RE.test(m.name));
}

/**
 * Group filtered members by their section kind for structured output.
 */
export function groupMembersBySection(compound: Compound): SectionGroup[] {
  const groups: Record<string, Member[]> = {};
  const order: string[] = [];

  for (const member of compound.filtered.members) {
    const key = member.section || 'func';
    if (!groups[key]) {
      groups[key] = [];
      order.push(key);
    }
    groups[key].push(member);
  }

  return order.map((section) => ({
    section,
    label: sectionLabel(section),
    members: groups[section],
  }));
}
