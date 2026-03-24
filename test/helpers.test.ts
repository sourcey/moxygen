import { describe, it, expect } from 'vitest';
import { inline, getAnchor, findParent, stripMarkdownLinks } from '../src/helpers.js';
import { createCompound } from '../src/compound.js';

describe('helpers', () => {
  describe('inline', () => {
    it('wraps a string in backticks', () => {
      expect(inline('void')).toBe('`void`');
    });

    it('wraps array segments in backticks, preserving links', () => {
      const result = inline(['public ', '[MyFunc]({#ref id1 #})', '()']);
      expect(result).toBe('`public `[`MyFunc`]({#ref id1 #})`()`');
    });

    it('handles line breaks in array', () => {
      const result = inline(['template<T>', '  \n', 'void func()']);
      expect(result).toBe('`template<T>`  \n`void func()`');
    });

    it('handles empty array', () => {
      expect(inline([])).toBe('');
    });
  });

  describe('getAnchor', () => {
    it('returns pandoc anchor when anchors enabled', () => {
      expect(getAnchor('myid', { anchors: true, htmlAnchors: false })).toBe('{#myid}');
    });

    it('returns html anchor when htmlAnchors enabled', () => {
      expect(getAnchor('myid', { anchors: false, htmlAnchors: true })).toBe('<a id="myid"></a>');
    });

    it('returns empty string when no anchors', () => {
      expect(getAnchor('myid', { anchors: false, htmlAnchors: false })).toBe('');
    });
  });

  describe('findParent', () => {
    it('finds the nearest parent matching kind', () => {
      const root = createCompound(null, 'root', 'root');
      root.kind = 'namespace';

      const cls = createCompound(root, 'cls1', 'MyClass');
      cls.kind = 'class';

      const result = findParent(cls, ['namespace']);
      expect(result).toBe(root);
    });

    it('returns the compound itself if it matches', () => {
      const cls = createCompound(null, 'cls1', 'MyClass');
      cls.kind = 'class';

      const result = findParent(cls, ['class']);
      expect(result).toBe(cls);
    });

    it('returns undefined when no match found', () => {
      const cls = createCompound(null, 'cls1', 'MyClass');
      cls.kind = 'class';

      const result = findParent(cls, ['group']);
      expect(result).toBeUndefined();
    });
  });

  describe('stripMarkdownLinks', () => {
    it('replaces markdown links with their labels', () => {
      const input = '[TrackHandle](#trackhandle) func([PeerSession::State](#state) state)';
      expect(stripMarkdownLinks(input)).toBe('TrackHandle func(PeerSession::State state)');
    });
  });
});
