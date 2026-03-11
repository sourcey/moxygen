import { describe, it, expect } from 'vitest';
import { refLink, link, escape } from '../src/markdown.js';

describe('markdown', () => {
  describe('link', () => {
    it('creates a markdown link', () => {
      expect(link('text', 'http://example.com')).toBe('[text](http://example.com)');
    });
  });

  describe('refLink', () => {
    it('creates an internal reference link', () => {
      expect(refLink('MyClass', 'class_my_class')).toBe('[MyClass]({#ref class_my_class #})');
    });
  });

  describe('escape.cell', () => {
    it('escapes pipe characters', () => {
      expect(escape.cell('a | b')).toBe('a \\| b');
    });

    it('replaces newlines with <br/>', () => {
      expect(escape.cell('line1\nline2')).toBe('line1<br/>line2');
    });

    it('trims leading and trailing newlines', () => {
      expect(escape.cell('\n\ncontent\n\n')).toBe('content');
    });
  });

  describe('escape.row', () => {
    it('strips trailing pipe with whitespace', () => {
      expect(escape.row('col1 | col2 | ')).toBe('col1 | col2');
    });
  });
});
