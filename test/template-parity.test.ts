import { describe, it, expect, afterAll } from 'vitest';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { run } from '../src/index.js';

const templateRoot = join(import.meta.dirname, '..', 'templates');
const globalGroupsXmlDir = join(import.meta.dirname, 'fixtures', 'global-groups', 'xml-out', 'xml');
// Its own root: test files run in parallel, and the integration suite removes
// .test-output wholesale when it finishes.
const outputRoot = join(import.meta.dirname, '..', '.test-output-parity');

afterAll(() => {
  if (existsSync(outputRoot)) {
    rmSync(outputRoot, { recursive: true });
  }
});

const read = (language: string, name: string) => readFileSync(join(templateRoot, language, name), 'utf8');

/** The fence language is the only intended difference between these files. */
const ignoreFenceLanguage = (template: string) => template.replace(/```(cpp|java)/g, '```lang');

describe('template parity', () => {
  // class.md diverges on purpose: Java has no header includes and different
  // member kinds. These two do not, and a fix applied to one of them silently
  // leaving the other behind is a drift this pins down.
  for (const name of ['namespace.md', 'index.md']) {
    it(`keeps cpp and java ${name} in step`, () => {
      expect(ignoreFenceLanguage(read('java', name))).toBe(ignoreFenceLanguage(read('cpp', name)));
    });
  }

  it('renders group descriptions through the java templates too', async () => {
    const outputDir = join(outputRoot, 'java-groups');

    await run({
      directory: globalGroupsXmlDir,
      output: join(outputDir, '%s.md'),
      language: 'java',
      groups: true,
      anchors: true,
      quiet: true,
    });

    const group = readFileSync(join(outputDir, 'global_group.md'), 'utf8');
    expect(group).toContain('The group holding global entities.');
    expect(group).toContain("This is the global group's description.");
    expect(group).not.toContain('## Description');
  });
});
