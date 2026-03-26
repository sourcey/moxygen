import type { Compound, Filters, Member, SectionGroup } from './types.js';

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
    filtered: { compounds: [], members: [], sections: [] },
    briefdescription: '',
    detaileddescription: '',
    summary: '',
    proto: '',
    namespace: '',
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

    // Skip items not belonging to current group
    if (groupid && (item as Member).groupid !== groupid) {
      continue;
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

const SECTION_LABELS: Record<string, string> = {
  'public-type': 'Public Types',
  'public-func': 'Public Methods',
  'public-static-func': 'Public Static Methods',
  'protected-func': 'Protected Methods',
  'private-func': 'Private Methods',
  'private-static-func': 'Private Static Methods',
  'public-attrib': 'Public Attributes',
  'public-static-attrib': 'Public Static Attributes',
  'protected-attrib': 'Protected Attributes',
  'private-attrib': 'Private Attributes',
  'signal': 'Signals',
  'public-slot': 'Public Slots',
  'protected-slot': 'Protected Slots',
  'private-slot': 'Private Slots',
  'property': 'Properties',
  'enum': 'Enumerations',
  'typedef': 'Typedefs',
  'define': 'Macros',
  'func': 'Functions',
  'var': 'Variables',
};

const NOISE_RE = /^(TYPE|BREAK|DEG|SEP|IMPL)_\d+$/;

/**
 * Remove noisy members: undocumented destructors, internal macros,
 * undocumented copy/move operators.
 */
export function filterNoise(members: Member[]): Member[] {
  return members.filter((m) => {
    if (m.section === 'define' && !m.briefdescription && !m.detaileddescription) return false;
    if (m.name.startsWith('~') && !m.briefdescription && !m.detaileddescription) return false;
    if (NOISE_RE.test(m.name)) return false;
    if (m.name === 'operator=' && !m.briefdescription && !m.detaileddescription) return false;
    return true;
  });
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
    label: SECTION_LABELS[section] || section,
    members: groups[section],
  }));
}
