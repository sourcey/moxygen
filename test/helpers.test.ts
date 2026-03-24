import { describe, it, expect } from 'vitest';
import {
  inline,
  getAnchor,
  findParent,
  stripMarkdownLinks,
  buildCleanAnchorMap,
  resolveRefs,
} from '../src/helpers.js';
import { createCompound } from '../src/compound.js';
import type { Compound, MoxygenOptions, References } from '../src/types.js';

describe('helpers', () => {
  function makeOptions(output: string): MoxygenOptions {
    return {
      directory: '/tmp/xml',
      output,
      groups: true,
      classes: false,
      pages: false,
      noindex: true,
      anchors: true,
      htmlAnchors: false,
      language: 'cpp',
      templates: '/tmp/templates',
      quiet: true,
      frontmatter: false,
      filters: { members: [], compounds: [] },
    };
  }

  function makeGroupedCompound(
    parent: Compound | null,
    id: string,
    name: string,
    kind: string,
    groupname: string,
  ): Compound {
    const compound = createCompound(parent, id, name);
    compound.kind = kind;
    compound.refid = id;
    compound.fullname = name;
    compound.shortname = name.split('::').pop() || name;
    compound.groupid = `group__${groupname}`;
    compound.groupname = groupname;
    if (parent) {
      parent.compounds[id] = compound;
    }
    return compound;
  }

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

  describe('resolveRefs', () => {
    it('writes relative markdown links for grouped multi-file output', () => {
      const baseGroup = makeGroupedCompound(null, 'group__base', 'base', 'group', 'base');
      const packetStream = makeGroupedCompound(
        baseGroup,
        'classicy_1_1PacketStream',
        'icy::PacketStream',
        'class',
        'base',
      );

      const webrtcGroup = makeGroupedCompound(null, 'group__webrtc', 'webrtc', 'group', 'webrtc');
      const references: References = {
        [baseGroup.refid]: baseGroup,
        [packetStream.refid]: packetStream,
        [webrtcGroup.refid]: webrtcGroup,
      };
      const anchorMap = buildCleanAnchorMap([baseGroup, packetStream, webrtcGroup]);
      const content = 'Uses [PacketStream]({#ref classicy_1_1PacketStream #}).';

      const resolved = resolveRefs(
        content,
        webrtcGroup,
        references,
        makeOptions('/tmp/docs/api/%s.md'),
        anchorMap,
      );

      expect(resolved).toContain('[PacketStream](base.md#packetstream)');
    });

    it('keeps same-file anchors for grouped markdown mirrors', () => {
      const webrtcGroup = makeGroupedCompound(null, 'group__webrtc', 'webrtc', 'group', 'webrtc');
      const mediaBridge = makeGroupedCompound(
        webrtcGroup,
        'classicy_1_1wrtc_1_1MediaBridge',
        'icy::wrtc::MediaBridge',
        'class',
        'webrtc',
      );

      const references: References = {
        [webrtcGroup.refid]: webrtcGroup,
        [mediaBridge.refid]: mediaBridge,
      };
      const anchorMap = buildCleanAnchorMap([webrtcGroup, mediaBridge]);
      const content = 'See [MediaBridge]({#ref classicy_1_1wrtc_1_1MediaBridge #}).';

      const resolved = resolveRefs(
        content,
        webrtcGroup,
        references,
        makeOptions('/tmp/docs/api/%s.md'),
        anchorMap,
      );

      expect(resolved).toContain('[MediaBridge](#mediabridge)');
    });

    it('writes child-page links when a slug map is provided', () => {
      const widgetGroup = makeGroupedCompound(null, 'group__widget', 'widget', 'group', 'widget');
      const widgetClass = makeGroupedCompound(
        widgetGroup,
        'classdemo_1_1Widget',
        'demo::Widget',
        'class',
        'widget',
      );

      const references: References = {
        [widgetGroup.refid]: widgetGroup,
        [widgetClass.refid]: widgetClass,
      };
      const anchorMap = buildCleanAnchorMap([widgetGroup, widgetClass]);
      const slugMap = new Map<string, string>([
        [widgetGroup.refid, 'widget'],
        [widgetClass.refid, 'demo-Widget'],
      ]);
      const content = '| Name |\n|------|\n| [Widget]({#ref classdemo_1_1Widget #}) |';

      const resolved = resolveRefs(
        content,
        widgetGroup,
        references,
        makeOptions('/tmp/docs/api/%s.md'),
        anchorMap,
        slugMap,
      );

      expect(resolved).toContain('[Widget](demo-Widget.html#widget-1)');
    });
  });
});
