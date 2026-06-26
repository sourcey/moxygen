import { describe, it, expect, afterAll, beforeAll } from 'vitest';
import { run, generate } from '../src/index.js';
import { readFileSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const outputRoot = join(import.meta.dirname, '..', '.test-output');
const exampleXmlDir = join(import.meta.dirname, '..', 'example', 'xml');
const fileGroupedXmlDir = join(import.meta.dirname, 'fixtures', 'file-grouped', 'xml-out', 'xml');
const fileGroupedSourceDir = join(import.meta.dirname, 'fixtures', 'file-grouped', 'src');
const sharedGroupedXmlDir = join(import.meta.dirname, 'fixtures', 'shared-grouped', 'xml-out', 'xml');
const sharedGroupedSourceDir = join(import.meta.dirname, 'fixtures', 'shared-grouped', 'src');
const titleDisambiguationXmlDir = join(import.meta.dirname, 'fixtures', 'title-disambiguation', 'xml-out', 'xml');
const titleDuplicationXmlDir = join(import.meta.dirname, 'fixtures', 'title-duplication', 'xml-out', 'xml');
const ungroupedXmlDir = join(import.meta.dirname, 'fixtures', 'ungrouped', 'xml-out', 'xml');
const programlistingLangXmlDir = join(import.meta.dirname, 'fixtures', 'programlisting-language', 'xml-out', 'xml');
const missingTagsXmlDir = join(import.meta.dirname, 'fixtures', 'missing-tags', 'xml-out', 'xml');
const memberKindsXmlDir = join(import.meta.dirname, 'fixtures', 'member-kinds', 'xml-out', 'xml');
const issue97XmlDir = join(import.meta.dirname, 'fixtures', 'issue-97', 'xml-out', 'xml');

const exampleOutputDir = join(outputRoot, 'example');

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

afterAll(() => {
  if (existsSync(outputRoot)) {
    rmSync(outputRoot, { recursive: true });
  }
});

beforeAll(async () => {
  await run({
    directory: exampleXmlDir,
    output: join(exampleOutputDir, 'api-%s.md'),
    groups: true,
    pages: true,
    anchors: true,
    quiet: true,
  });
});

describe('integration', () => {
  it('generates grouped output from example XML', async () => {
    const expectedFiles = [
      'api-bicycle.md',
      'api-mountainbike.md',
      'api-racingbike.md',
    ];

    for (const file of expectedFiles) {
      const filepath = join(exampleOutputDir, file);
      expect(existsSync(filepath), `${file} should exist`).toBe(true);
      expect(read(filepath).length).toBeGreaterThan(0);
    }
  });

  it('generates page output', async () => {
    const expectedPages = [
      'page-changelog.md',
      'page-overview.md',
    ];

    for (const file of expectedPages) {
      const filepath = join(exampleOutputDir, file);
      expect(existsSync(filepath), `${file} should exist`).toBe(true);
      expect(read(filepath).length).toBeGreaterThan(0);
    }
  });

  it('outputs expected explicit-group class documentation', async () => {
    const content = read(join(exampleOutputDir, 'api-bicycle.md'));

    expect(content).toContain('Bicycle');
    expect(content).toContain('PedalHarder');
    expect(content).toContain('RingBell');
    expect(content).toContain('{#pedalharder}');
    expect(content).toContain('### Public Methods');
    expect(content).toContain('#include <bicycle.h>');
    expect(content).toContain('`void`');
    expect(content).toContain('`virtual`');
    expect(content).toContain('Standard bicycle class');
  });

  it('recovers grouped output from file-level grouped fixtures', async () => {
    const outputDir = join(outputRoot, 'file-grouped');

    await run({
      directory: fileGroupedXmlDir,
      output: join(outputDir, '%s.md'),
      groups: true,
      anchors: true,
      quiet: true,
      sourceRoot: fileGroupedSourceDir,
    });

    const filepath = join(outputDir, 'widget.md');
    expect(existsSync(filepath), 'widget.md should exist').toBe(true);

    const content = read(filepath);
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('# widget');
    expect(content).toContain('Module page for a widget API documented with file-level grouping.');
    expect(content).toContain('### Namespaces');
    expect(content).toContain('documented via file-level grouping only.');
    expect(content).toContain('createWidget');
    expect(content).toContain('Returns the current widget size.');
    expect(content).toContain('## Options');
    expect(content).toContain('nested inside [Widget](#widget)');
  });

  it('preserves ungrouped namespace and class output', async () => {
    const outputDir = join(outputRoot, 'ungrouped');

    await run({
      directory: ungroupedXmlDir,
      output: join(outputDir, '%s.md'),
      classes: true,
      anchors: true,
      quiet: true,
    });

    const namespacePath = join(outputDir, 'demo.md');
    const classPath = join(outputDir, 'demo-Plain.md');

    expect(existsSync(namespacePath), 'demo.md should exist').toBe(true);
    expect(existsSync(classPath), 'demo-Plain.md should exist').toBe(true);

    const namespaceContent = read(namespacePath);
    expect(namespaceContent).toContain('# demo');
    expect(namespaceContent).toContain('namespace-scoped type for ungrouped rendering.');
    expect(namespaceContent).toContain('demo-Plain.md#plain');

    const classContent = read(classPath);
    expect(classContent).toContain('## Plain');
    expect(classContent).toContain('#include <plain.h>');
    expect(classContent).toContain('Returns a stable value.');
  });

  it('renders grouped overview links as same-page anchors', async () => {
    const outputDir = join(outputRoot, 'file-grouped-links');

    await run({
      directory: fileGroupedXmlDir,
      output: join(outputDir, '%s.md'),
      groups: true,
      anchors: true,
      quiet: true,
      sourceRoot: fileGroupedSourceDir,
    });

    const markdownMirror = read(join(outputDir, 'widget.md'));
    expect(markdownMirror).toContain('| [`demo`](#demo) |');

    const pages = await generate({
      directory: fileGroupedXmlDir,
      groups: true,
      anchors: true,
      quiet: true,
      sourceRoot: fileGroupedSourceDir,
    });

    const groupPage = pages.find((page) => page.kind === 'group' && page.slug === 'widget');
    expect(groupPage).toBeDefined();
    expect(groupPage!.markdown).toContain('| [`demo`](#demo) |');
  });

  it('writes grouped output, page output, and root globals in one run', async () => {
    const outputDir = join(outputRoot, 'issue-97');

    await run({
      directory: issue97XmlDir,
      output: join(outputDir, '%s.md'),
      groups: true,
      pages: true,
      anchors: true,
      quiet: true,
    });

    const page = read(join(outputDir, 'page-index.md'));
    expect(page).toContain('# Main {#main}');
    expect(page).toContain('Reference [Group 1](g1.md#group1)');
    expect(page).toContain('Reference [a1](api.md#a1)');
    expect(page).toContain('Reference [g1_a1](g1.md#g1_a1)');

    const api = read(join(outputDir, 'api.md'));
    expect(api).toContain('#### a1');
    expect(api).toContain('a1 is a top level 1');
    expect(api).not.toContain('g1_a1');

    const group = read(join(outputDir, 'g1.md'));
    expect(group).toContain('#### g1_a1');
  });

  it('keeps root-level classes from shared namespaces on grouped module pages', async () => {
    const outputDir = join(outputRoot, 'shared-grouped');

    await run({
      directory: sharedGroupedXmlDir,
      output: join(outputDir, '%s.md'),
      groups: true,
      anchors: true,
      quiet: true,
      sourceRoot: sharedGroupedSourceDir,
    });

    const baseContent = read(join(outputDir, 'base.md'));
    const webrtcContent = read(join(outputDir, 'webrtc.md'));

    expect(baseContent).toContain('# base');
    expect(baseContent).toContain('Packet pipeline primitive owned by the base module.');
    expect(baseContent).toContain('[`PacketStream`](#packetstream)');
    expect(baseContent).toContain('## PacketStream');
    expect(webrtcContent).toContain('base.md#packetstream');
    expect(webrtcContent).toContain('uv.md#loop');
    expect(webrtcContent).not.toContain('undefined.md');

    const pages = await generate({
      directory: sharedGroupedXmlDir,
      groups: true,
      anchors: true,
      quiet: true,
      sourceRoot: sharedGroupedSourceDir,
    });

    const groupPage = pages.find((page) => page.kind === 'group' && page.slug === 'webrtc');
    expect(groupPage).toBeDefined();
    expect(groupPage!.markdown).toContain('demo-PacketStream.html#packetstream');
  });

  it('resolves generated page descriptions with the same cross-links as the body markdown', async () => {
    const pages = await generate({
      directory: sharedGroupedXmlDir,
      groups: true,
      anchors: true,
      quiet: true,
      sourceRoot: sharedGroupedSourceDir,
    });

    const peerSession = pages.find((page) => page.slug === 'demo-PeerSession');
    expect(peerSession).toBeDefined();
    expect(peerSession!.description)
      .toBe('Session type documented in a different group from [PacketStream](demo-PacketStream.html#packetstream).');
  });

  it('uses minimal namespace qualifiers for duplicate generated page titles', async () => {
    const pages = await generate({
      directory: titleDisambiguationXmlDir,
      quiet: true,
    });

    const queue = pages.find((page) => page.slug === 'demo-Queue');
    const ipcQueue = pages.find((page) => page.slug === 'demo-ipc-Queue');

    expect(queue?.title).toBe('Queue');
    expect(ipcQueue?.title).toBe('ipc::Queue');
  });

  it('writes resolved links into frontmatter descriptions', async () => {
    const outputDir = join(outputRoot, 'shared-grouped-frontmatter');

    await run({
      directory: sharedGroupedXmlDir,
      output: join(outputDir, '%s.md'),
      classes: true,
      anchors: true,
      quiet: true,
      frontmatter: true,
    });

    const content = read(join(outputDir, 'demo-PeerSession.md'));
    expect(content)
      .toContain('description: "Session type documented in a different group from [PacketStream](demo-PacketStream.md#packetstream)."');
  });

  it('uses programlisting filename extension as the code fence language', async () => {
    const outputDir = join(outputRoot, 'programlisting-language');

    await run({
      directory: programlistingLangXmlDir,
      output: join(outputDir, '%s.md'),
      classes: true,
      anchors: false,
      quiet: true,
    });

    const content = read(join(outputDir, 'demo.md')).replace(/\r\n/g, '\n');
    expect(content).toContain('```py');
    expect(content).not.toContain('```cpp');
  });

  it('generates single file output', async () => {
    const singleOutput = join(outputRoot, 'single-api.md');

    await run({
      directory: exampleXmlDir,
      output: singleOutput,
      quiet: true,
    });

    expect(existsSync(singleOutput)).toBe(true);
    const content = read(singleOutput);
    expect(content).toContain('Generated by [Moxygen]');
    expect(content).toContain('Bicycle');
    expect(content).toContain('MountainBike');
    expect(content).toContain('RacingBike');
  });

  it('writes frontmatter for single file output', async () => {
    const singleOutput = join(outputRoot, 'single-api-frontmatter.md');

    await run({
      directory: exampleXmlDir,
      output: singleOutput,
      quiet: true,
      frontmatter: true,
    });

    const content = read(singleOutput);
    expect(content).toMatch(/^---\ntitle: "API Reference"\nkind: index\n---\n# API Reference/);
  });

  it('does not duplicate Doxygen section titles into the section body', async () => {
    const outputDir = join(outputRoot, 'title-duplication');

    await run({
      directory: titleDuplicationXmlDir,
      output: join(outputDir, '%s.md'),
      classes: true,
      anchors: false,
      quiet: true,
    });

    const content = read(join(outputDir, 'demo.md')).replace(/\r\n/g, '\n');
    expect(content).toContain('## Requirements\n\n### Windows\nSupported on Windows 11.');
    expect(content).not.toContain('## Requirements\nRequirements');
    expect(content).not.toContain('### Windows\nWindowsSupported on Windows 11.');
  });

  it('renders page-oriented XML tags used by detailed docs', async () => {
    const outputDir = join(outputRoot, 'missing-tags');

    await run({
      directory: missingTagsXmlDir,
      output: join(outputDir, '%s.md'),
      classes: true,
      anchors: true,
      quiet: true,
    });

    const content = read(join(outputDir, 'demo.md')).replace(/\r\n/g, '\n');
    expect(content).toContain('Manual anchor {#namespacedemo_1manual_anchor}target.');
    expect(content).toContain('```\ncmake --build .\nctest --output-on-failure\n```');
    expect(content).toContain('* **Class**: Type-level documentation.');
    expect(content).toContain('* **Member**: Member-level documentation.');
    expect(content).toContain('##### Windows\nSupported on Windows 11.');
  });

  it('renders unions, static methods, and private members', async () => {
    const outputDir = join(outputRoot, 'member-kinds');

    await run({
      directory: memberKindsXmlDir,
      output: join(outputDir, '%s.md'),
      classes: true,
      anchors: true,
      quiet: true,
    });

    const utility = read(join(outputDir, 'demo-Utility.md'));
    expect(utility).toContain('### Public Static Methods');
    expect(utility).toContain('| `Utility` | [`create`](#create) `static` | Creates a utility instance. |');
    expect(utility).toContain('static Utility create()');
    expect(utility).toContain('### Public Methods');
    expect(utility).toContain('| `auto` | [`modern`](#modern) `virtual` `const` `inline` `nodiscard` `constexpr` `&` `noexcept(noexcept(std::declval<T>()))` `-> int` `requires std::integral<T>` | Modern qualified member. |');
    expect(utility).toContain('template<typename T> [[nodiscard]] constexpr virtual inline auto modern() const & noexcept(noexcept(std::declval<T>())) -> int requires std::integral<T>');
    expect(utility).toContain('### Private Methods');
    expect(utility).toContain('Hidden helper method.');
    expect(utility).toContain('### Private Attributes');
    expect(utility).toContain('Private instance state.');
    expect(utility).toContain('### Private Static Attributes');
    expect(utility).toContain('| `int` | [`globalSecret`](#globalsecret) `static` | Private static state. |');

    const union = read(join(outputDir, 'demo-Value.md'));
    expect(union).toContain('## Value');
    expect(union).toContain('Union value representation.');
    expect(union).toContain('### Public Attributes');
    expect(union).toContain('Integer representation.');
  });
});
