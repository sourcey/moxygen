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
const ungroupedXmlDir = join(import.meta.dirname, 'fixtures', 'ungrouped', 'xml-out', 'xml');

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
    const classPath = join(outputDir, 'demo--Plain.md');

    expect(existsSync(namespacePath), 'demo.md should exist').toBe(true);
    expect(existsSync(classPath), 'demo--Plain.md should exist').toBe(true);

    const namespaceContent = read(namespacePath);
    expect(namespaceContent).toContain('# demo');
    expect(namespaceContent).toContain('namespace-scoped type for ungrouped rendering.');
    expect(namespaceContent).toContain('demo--Plain.md#plain');

    const classContent = read(classPath);
    expect(classContent).toContain('## Plain');
    expect(classContent).toContain('#include <plain.h>');
    expect(classContent).toContain('Returns a stable value.');
  });

  it('renders grouped overview links differently for markdown mirrors and generated pages', async () => {
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
    expect(groupPage!.markdown).toContain('| [`demo`](demo.html#demo) |');
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

    const content = read(join(outputDir, 'demo--PeerSession.md'));
    expect(content)
      .toContain('description: "Session type documented in a different group from [PacketStream](demo--PacketStream.md#packetstream)."');
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
});
