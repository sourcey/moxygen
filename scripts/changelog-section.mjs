#!/usr/bin/env node
// Print the CHANGELOG section for one version, for use as GitHub release notes.
// Exits non-zero when the section is missing, so a release cannot ship
// undocumented.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const version = process.argv[2];
if (!version) {
  console.error('usage: changelog-section.mjs <version>');
  process.exit(1);
}

const changelogPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'CHANGELOG.md');
const lines = readFileSync(changelogPath, 'utf8').split('\n');

const isVersionHeading = (line) => /^## /.test(line);
const start = lines.findIndex((line) => isVersionHeading(line) && line.slice(3).trim().startsWith(version));

if (start === -1) {
  console.error(`CHANGELOG.md has no "## ${version}" section.`);
  console.error('Add the entry before releasing, so the notes describe the change.');
  process.exit(1);
}

const rest = lines.slice(start + 1);
const end = rest.findIndex(isVersionHeading);
const body = (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();

if (!body) {
  console.error(`The "## ${version}" section in CHANGELOG.md is empty.`);
  process.exit(1);
}

console.log(body);
