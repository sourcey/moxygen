#!/usr/bin/env node
// Regenerate one fixture's Doxygen XML.
//
// Fixtures are committed Doxygen output, and different Doxygen versions emit
// different schema boilerplate. Regenerating with the wrong version buries a
// real change in hundreds of lines of unrelated churn, so this refuses to run
// unless the local Doxygen matches the version that produced the fixture.
//
// Five fixtures have no Doxyfile or sources at all. Their XML is hand authored
// to reach shapes Doxygen will not emit on demand, and it must be edited by
// hand. This script names them rather than pretending they are reproducible.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fixtureRoot = join(root, 'test', 'fixtures');

/** Fixture directory plus the location of its generated index.xml. */
function targets() {
  const found = new Map([['example', { dir: join(root, 'example'), index: join(root, 'example', 'xml', 'index.xml') }]]);
  for (const name of readdirSync(fixtureRoot)) {
    const dir = join(fixtureRoot, name);
    found.set(name, { dir, index: join(dir, 'xml-out', 'xml', 'index.xml') });
  }
  return found;
}

/** The Doxygen version recorded in generated XML, e.g. 1.17.0. */
function recordedVersion(indexPath) {
  if (!existsSync(indexPath)) return undefined;
  return readFileSync(indexPath, 'utf8').match(/version="([^"]+)"/)?.[1];
}

function localVersion() {
  try {
    return execFileSync('doxygen', ['--version'], { encoding: 'utf8' }).trim().split(/\s+/)[0];
  } catch {
    return undefined;
  }
}

const all = targets();
const name = process.argv[2];
const allowVersionChange = process.argv.includes('--allow-version-change');

if (!name || !all.has(name)) {
  const rows = [...all.entries()].map(([key, { dir, index }]) => {
    const reproducible = existsSync(join(dir, 'Doxyfile'));
    const version = recordedVersion(index) ?? 'unknown';
    return `  ${key.padEnd(26)} ${reproducible ? `doxygen ${version}` : 'hand authored, edit directly'}`;
  });
  console.error('usage: npm run fixtures -- <name> [--allow-version-change]\n');
  console.error(rows.join('\n'));
  process.exit(name ? 1 : 0);
}

const { dir, index } = all.get(name);

if (!existsSync(join(dir, 'Doxyfile'))) {
  console.error(`${name} has no Doxyfile. Its XML is hand authored and must be edited directly.`);
  process.exit(1);
}

const local = localVersion();
if (!local) {
  console.error('doxygen is not on PATH.');
  process.exit(1);
}

const recorded = recordedVersion(index);
if (recorded && recorded !== local && !allowVersionChange) {
  console.error(`${name} was generated with doxygen ${recorded}, but ${local} is installed.`);
  console.error('Regenerating now would mix schema churn into the diff.');
  console.error(`Install doxygen ${recorded}, or pass --allow-version-change if the bump is intended.`);
  process.exit(1);
}

execFileSync('doxygen', ['Doxyfile'], { cwd: dir, stdio: 'inherit' });
console.log(`Regenerated ${name} with doxygen ${local}.`);
