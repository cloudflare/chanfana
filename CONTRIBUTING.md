# Contributing to chanfana

Thanks for your interest in contributing! This guide explains how to set up the project, what we expect from a
pull request, and how changes get reviewed and released.

## Development setup

- **Node.js**: `>=18` is required (see `engines` in `package.json`). CI runs on Node 24, which is recommended.
- Install dependencies with:

```bash
npm ci
```

## Commands

```bash
npm test                         # Typecheck (tsc) + run all tests (vitest)
npm test -- <file>               # Run a single test file, e.g. npm test -- coverage-gaps.test.ts
npm test -- --coverage           # Run tests with a coverage report
npm run lint                     # Lint (oxlint) and format check (oxfmt)
npm run lint:fix                 # Apply oxlint fixes and format with oxfmt
npm run build                    # Build CJS + ESM bundles to dist/
npm run docs:dev                 # Run the VitePress documentation site locally
```

## Project layout

See [`AGENTS.md`](./AGENTS.md) for the project layout, code style, architecture notes and Zod v4 rules. In short:
source lives in `src/`, tests in `tests/integration/` and documentation in `docs/`.

## Tests

- All tests are integration tests in `tests/integration/`, written with Vitest `describe`/`it`.
- Tests run inside `@cloudflare/vitest-plugin`, with a real D1 binding for the D1 endpoints.
- Every bug fix or feature should include tests that cover the change.

## Zod v4

chanfana uses Zod v4. Use v4 syntax everywhere (for example `z.email()` instead of `z.string().email()`,
`z.iso.datetime()` instead of `z.string().datetime()`). See `AGENTS.md` for the full list.

## Changesets

We use [changesets](https://github.com/changesets/changesets) to version and release the package. Every pull
request needs a changeset:

```bash
npx changeset
```

- Pick `patch` for fixes and `minor` for new features. Breaking changes require a `major` bump and discussion first.
- For internal-only changes (tests, CI, docs), add an empty changeset containing only the frontmatter:

```md
---
---
```

## Pull requests and review

1. Fork the repository (or create a branch) and open a pull request against `main`.
2. Fill in the pull request template: summary, linked issue, how it was tested.
3. CI must pass: build, lint, tests and the changeset check.
4. A maintainer listed in [`CODEOWNERS`](./CODEOWNERS) reviews and approves the change.

For larger changes, please open an issue first to discuss the approach.

## Merge strategy

Pull requests are **squash merged** into `main`, so each PR becomes a single commit whose subject ends with the PR
number (for example `fix: accept requests that omit optional headers (#371)`). Please use a
[conventional commit](https://www.conventionalcommits.org/) style PR title (`feat: ...`, `fix: ...`, `docs: ...`,
`chore: ...`), since it becomes the commit message.

Releases are automated: merged changesets are collected into a "Version Packages" pull request, and merging it
publishes to npm.

## Support

- Support is provided on a best-effort basis by the maintainers.
- Report bugs and request features via [GitHub issues](https://github.com/cloudflare/chanfana/issues).
- **Do not report security vulnerabilities in public issues.** Follow Cloudflare's
  [vulnerability disclosure policy](https://www.cloudflare.com/disclosure/) and report them through
  [HackerOne](https://hackerone.com/cloudflare).
