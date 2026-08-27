# Contributing

## Development

```bash
npm install
npm run build     # tsc
npm run lint      # tsc --noEmit
npm test          # vitest run
```

CI runs build, lint and tests on Node 20, 22 and 24, and checks that the
committed example output is current.

## Committed generated output

Two kinds of generated files are committed, and they are checked differently.

**`example/doc/`** is Markdown rendered from `example/xml`. Regenerate with
`npm run example` after any change that affects output, and commit the result.
CI fails if regenerating produces a diff, so this cannot drift silently.

**`test/fixtures/*/xml-out/`** is Doxygen XML. Different Doxygen versions emit
different schema boilerplate, so regenerating with the wrong version buries a
real change in unrelated churn. Use:

```bash
npm run fixtures                  # list fixtures and the version each needs
npm run fixtures -- global-groups # regenerate one
```

The script refuses to run when the installed Doxygen does not match the version
that produced that fixture. Pass `--allow-version-change` when the bump is
deliberate.

Five fixtures (`member-kinds`, `missing-tags`, `programlisting-language`,
`title-disambiguation`, `title-duplication`) have no Doxyfile or sources. Their
XML is hand authored to reach shapes Doxygen will not emit on demand, and it is
edited directly.

## Templates

`templates/cpp/` and `templates/java/` are near-identical. `namespace.md` and
`index.md` must stay in step apart from the code fence language, and
`test/template-parity.test.ts` enforces that. A fix to one is a fix to both.
`class.md` diverges on purpose.

## Releasing

Releases are driven by the version in `package.json`. There is no separate
tagging step.

1. Add the entry to `CHANGELOG.md` under a `## <version>` heading.
2. `npm version patch` (or `minor` / `major`) with no git tag:
   `npm version patch --no-git-tag-version`. This keeps `package.json` and
   `package-lock.json` in step; the release refuses to run if they disagree.
3. Commit as `Bump version to <version>` and merge to `main`.

Landing that on `main` runs the release workflow, which validates, tags
`v<version>`, creates the GitHub release using the changelog section as its
notes, and publishes to npm with provenance. Every other push to `main`
resolves to a no-op in seconds.

A release cannot ship without a changelog entry: the workflow fails early when
the section is missing.
