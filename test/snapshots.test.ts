import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { generate, run } from '../src/index.js';

/**
 * Full-output snapshots for every reproducible fixture.
 *
 * The other suites assert on chosen lines, so a change outside those lines
 * lands silently. These render each fixture with every output mode enabled and
 * compare the whole result, which makes any change to generated Markdown show
 * up as a reviewable diff rather than as nothing at all.
 *
 * Update deliberately with `npx vitest run -u` and read the diff.
 */
const fixtureRoot = join(import.meta.dirname, 'fixtures');
const snapshotRoot = join(import.meta.dirname, 'snapshots');
const outputRoot = join(import.meta.dirname, '..', '.test-output-snapshots');

const fixtures = readdirSync(fixtureRoot)
  .filter((name) => existsSync(join(fixtureRoot, name, 'xml-out', 'xml')))
  .sort();

afterAll(() => {
  if (existsSync(outputRoot)) {
    rmSync(outputRoot, { recursive: true });
  }
});

describe('rendered output', () => {
  it('covers every fixture', () => {
    expect(fixtures.length).toBeGreaterThan(0);
  });

  for (const name of fixtures) {
    it(`renders ${name}`, async () => {
      const outputDir = join(outputRoot, name);
      const xmlDir = join(fixtureRoot, name, 'xml-out', 'xml');

      // Enabling a mode the fixture has no content for is an error, so the
      // modes are read from the fixture instead of being listed here.
      const index = readFileSync(join(xmlDir, 'index.xml'), 'utf8');

      await run({
        directory: xmlDir,
        output: join(outputDir, '%s.md'),
        groups: /kind="group"/.test(index),
        pages: /kind="page"/.test(index),
        classes: /kind="(class|struct|interface|union)"/.test(index),
        anchors: true,
        quiet: true,
      });

      const files = readdirSync(outputDir).sort();

      // The set of generated files is part of the output contract.
      await expect(files.join('\n')).toMatchFileSnapshot(join(snapshotRoot, name, 'FILES.txt'));

      for (const file of files) {
        await expect(readFileSync(join(outputDir, file), 'utf8'))
          .toMatchFileSnapshot(join(snapshotRoot, name, file));
      }
    });

    // generate() returns search entries that run() never writes to disk, so
    // the file snapshots above cannot see them.
    it(`indexes ${name} for search`, async () => {
      const pages = await generate({
        directory: join(fixtureRoot, name, 'xml-out', 'xml'),
        quiet: true,
      });

      const entries = pages.flatMap((page) => page.searchEntries ?? []);
      await expect(`${JSON.stringify(entries, null, 2)}\n`)
        .toMatchFileSnapshot(join(snapshotRoot, name, 'SEARCH.json'));
    });
  }
});
