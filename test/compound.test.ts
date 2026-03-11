import { describe, it, expect } from 'vitest';
import {
  createCompound,
  findCompound,
  toArray,
  toFilteredArray,
  filterChildren,
  filterCollection,
} from '../src/compound.js';
import type { Compound, Member } from '../src/types.js';

function makeMember(name: string, section: string, groupid?: string): Member {
  return {
    name,
    refid: name,
    kind: 'function',
    parent: null as unknown as Compound,
    section,
    prot: 'public',
    static: 'no',
    virtual: 'no',
    proto: '',
    briefdescription: '',
    detaileddescription: '',
    summary: '',
    enumvalue: [],
    groupid,
  };
}

describe('compound', () => {
  describe('createCompound', () => {
    it('creates a compound with default values', () => {
      const c = createCompound();
      expect(c.parent).toBeNull();
      expect(c.id).toBe('');
      expect(c.name).toBe('');
      expect(c.compounds).toEqual({});
      expect(c.members).toEqual([]);
      expect(c.basecompoundref).toEqual([]);
      expect(c.filtered.compounds).toEqual([]);
      expect(c.filtered.members).toEqual([]);
    });

    it('creates a compound with given parent, id, and name', () => {
      const parent = createCompound();
      const child = createCompound(parent, 'child1', 'MyClass');
      expect(child.parent).toBe(parent);
      expect(child.id).toBe('child1');
      expect(child.name).toBe('MyClass');
    });
  });

  describe('findCompound', () => {
    it('returns undefined for non-existent id when create is false', () => {
      const root = createCompound();
      expect(findCompound(root, 'missing', 'Missing', false)).toBeUndefined();
    });

    it('creates and returns compound when create is true', () => {
      const root = createCompound();
      const found = findCompound(root, 'ns1', 'Namespace', true);
      expect(found).toBeDefined();
      expect(found!.id).toBe('ns1');
      expect(found!.name).toBe('Namespace');
      expect(root.compounds['ns1']).toBe(found);
    });

    it('returns existing compound on second lookup', () => {
      const root = createCompound();
      const first = findCompound(root, 'ns1', 'Namespace', true);
      const second = findCompound(root, 'ns1', 'Namespace', false);
      expect(second).toBe(first);
    });
  });

  describe('toArray', () => {
    it('collects all nested compounds into a flat array', () => {
      const root = createCompound(null, 'root', 'root');
      const ns = createCompound(root, 'ns1', 'transport');
      ns.kind = 'namespace';
      root.compounds['ns1'] = ns;

      const cls = createCompound(ns, 'cls1', 'Bicycle');
      cls.kind = 'class';
      ns.compounds['cls1'] = cls;

      const all = toArray(root) as Compound[];
      expect(all).toHaveLength(2);
      expect(all[0].name).toBe('transport');
      expect(all[1].name).toBe('Bicycle');
    });

    it('filters by kind', () => {
      const root = createCompound(null, 'root', 'root');

      const ns = createCompound(root, 'ns1', 'transport');
      ns.kind = 'namespace';
      root.compounds['ns1'] = ns;

      const grp = createCompound(root, 'grp1', 'mygroup');
      grp.kind = 'group';
      root.compounds['grp1'] = grp;

      const namespaces = toArray(root, 'compounds', 'namespace') as Compound[];
      expect(namespaces).toHaveLength(1);
      expect(namespaces[0].name).toBe('transport');

      const groups = toArray(root, 'compounds', 'group') as Compound[];
      expect(groups).toHaveLength(1);
      expect(groups[0].name).toBe('mygroup');
    });
  });

  describe('filterCollection', () => {
    it('filters items by allowed categories', () => {
      const members: Member[] = [
        makeMember('func1', 'public-func'),
        makeMember('var1', 'public-attrib'),
        makeMember('func2', 'private-func'),
      ];

      const result = filterCollection(members, 'section', ['public-func', 'public-attrib']);
      expect(result).toHaveLength(2);
    });

    it('orders by category order', () => {
      const members: Member[] = [
        makeMember('var1', 'public-attrib'),
        makeMember('func1', 'public-func'),
      ];

      const result = filterCollection(members, 'section', ['public-func', 'public-attrib']);
      expect((result[0] as Member).name).toBe('func1');
      expect((result[1] as Member).name).toBe('var1');
    });

    it('filters by groupid when provided', () => {
      const members: Member[] = [
        makeMember('func1', 'public-func', 'group1'),
        makeMember('func2', 'public-func', 'group2'),
      ];

      const result = filterCollection(members, 'section', ['public-func'], 'group1');
      expect(result).toHaveLength(1);
      expect((result[0] as Member).name).toBe('func1');
    });
  });

  describe('filterChildren', () => {
    it('populates filtered arrays on compound and children', () => {
      const root = createCompound(null, 'root', 'root');
      root.kind = 'index';

      const ns = createCompound(root, 'ns1', 'transport');
      ns.kind = 'namespace';
      root.compounds['ns1'] = ns;

      const cls = createCompound(ns, 'cls1', 'Bicycle');
      cls.kind = 'class';
      ns.compounds['cls1'] = cls;

      cls.members.push(makeMember('func1', 'public-func'));
      cls.members.push(makeMember('var1', 'public-attrib'));

      const filters = {
        members: ['public-func', 'public-attrib'],
        compounds: ['namespace', 'class'],
      };

      filterChildren(root, filters);

      expect(root.filtered.compounds).toHaveLength(1);
      expect(root.filtered.compounds[0].name).toBe('transport');
      expect(cls.filtered.members).toHaveLength(2);
    });
  });

  describe('toFilteredArray', () => {
    it('flattens filtered compounds recursively', () => {
      const root = createCompound(null, 'root', 'root');
      root.kind = 'index';

      const ns = createCompound(root, 'ns1', 'transport');
      ns.kind = 'namespace';
      root.compounds['ns1'] = ns;

      const cls = createCompound(ns, 'cls1', 'Bicycle');
      cls.kind = 'class';
      ns.compounds['cls1'] = cls;

      // Manually set filtered to simulate filterChildren
      root.filtered.compounds = [ns];
      ns.filtered.compounds = [cls];
      cls.filtered.compounds = [];

      const result = toFilteredArray(root);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('transport');
      expect(result[1].name).toBe('Bicycle');
    });
  });
});
