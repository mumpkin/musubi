# Contributing

Everything in this repository is written in English: code, comments, commit
messages, branch names, issues, pull requests, changelog and documentation.

## Development setup

Requirements: Node.js 24 or later, pnpm (version pinned in `package.json`),
Rust 1.92 or later, the [Typst CLI](https://github.com/typst/typst) 0.15, and
the [Tauri system dependencies](https://v2.tauri.app/start/prerequisites/).

```sh
pnpm install          # also installs the git hooks (lefthook)
pnpm dev:tauri        # desktop app
```

| Command                                                 | Purpose                                                    |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| `pnpm check`                                            | Lint and format check (ESLint, Prettier), Rust file length |
| `pnpm fix`                                              | Apply the automatic fixes and formatting                   |
| `pnpm typecheck`                                        | Type checking (TypeScript, Svelte)                         |
| `pnpm test`                                             | Unit tests (Vitest)                                        |
| `pnpm test:coverage`                                    | Unit tests with coverage                                   |
| `pnpm test:typst`                                       | Typst package tests (needs the Typst CLI)                  |
| `pnpm duplicates`                                       | Duplicate code detection (jscpd)                           |
| `cargo test`                                            | Rust tests; also regenerates the TypeScript bindings       |
| `cargo clippy --workspace --all-targets -- -D warnings` | Rust lint                                                  |

Git hooks run ESLint, Prettier and `cargo fmt` on staged files, check the
commit message and, before pushing, the branch name. The CI runs the same
checks, and `main` only accepts pull requests with a green CI.

## Work tracking

Work is tracked in GitHub issues, grouped by milestone, on the
[Musubi project board](https://github.com/users/mumpkin/projects/6). A pull
request closes its issue with `Closes #<number>`.

## Clean Code

The code follows the rules of _Clean Code_ (Robert C. Martin), in TypeScript,
Svelte and Rust alike.

- **Descriptive names, no obfuscation.** Single-letter identifiers are
  forbidden, including loop counters, callback parameters and `catch`
  bindings: write `index`, `note`, `error`. Avoid cryptic abbreviations.
- **Small functions that do one thing**, at one level of abstraction.
- **Few arguments**: three at most; group related values in an object or a
  struct.
- **No side effects hidden behind a name** that does not announce them.
- **No magic numbers**: use named constants.
- **No nested ternaries, no parameter reassignment, always use braces.**
- **Comments explain why, not what.** If code needs a comment to explain what
  it does, rename or extract instead.
- **Tests are first-class code** and follow the same rules.

The tools enforce what can be automated:

| Rule                                   | TypeScript / Svelte (ESLint)           | Rust (Clippy, rustfmt)          |
| -------------------------------------- | -------------------------------------- | ------------------------------- |
| Cognitive complexity ≤ 10              | `sonarjs/cognitive-complexity`         | `clippy::cognitive_complexity`  |
| Functions ≤ 40 lines (tests excluded)  | `max-lines-per-function`               | `clippy::too_many_lines`        |
| ≤ 3 parameters                         | `@typescript-eslint/max-params`        | `clippy::too_many_arguments`    |
| Files ≤ 300 lines                      | `max-lines`                            | `tools/check-file-length.ts`    |
| No single-letter identifiers           | `id-length`                            | `clippy::min_ident_chars`       |
| No shadowing                           | `@typescript-eslint/no-shadow`         | `clippy::shadow_unrelated`      |
| No magic numbers (tests excluded)      | `@typescript-eslint/no-magic-numbers`  | review                          |
| No nested ternaries, braces everywhere | `no-nested-ternary`, `curly`           | language                        |
| No parameter reassignment              | `no-param-reassign`                    | language (immutable by default) |
| Strict ASCII naming                    | `@typescript-eslint/naming-convention` | compiler lints                  |
| No unused code, sorted imports         | `no-unused-vars`, `simple-import-sort` | compiler lints, rustfmt         |

## Code style

- **TypeScript and Svelte** are formatted by ESLint (ESLint Stylistic and
  `eslint-plugin-svelte`): tabs (width 4), 80 columns, single quotes,
  semicolons, trailing commas.
- **JSON, YAML and Markdown** are formatted by Prettier, which never touches
  TypeScript or Svelte files.
- **Rust** is formatted by rustfmt: tabs, 80 columns.

Run `pnpm fix` before pushing; the pre-commit hook checks the staged files.

Every source file starts with a license header:

```ts
// SPDX-License-Identifier: GPL-3.0-or-later
```

## Rust and TypeScript types

Types sent from Rust to the interface derive `ts_rs::TS` with
`#[ts(export)]`. `cargo test` writes them to `apps/desktop/src/lib/bindings/`;
commit them with the Rust change. The CI fails if they are out of date.

## Branches

Every change goes through a branch and a pull request. The branch prefix
carries the type of change:

| Prefix      | Use                                  |
| ----------- | ------------------------------------ |
| `feat/`     | New feature                          |
| `fix/`      | Bug fix                              |
| `docs/`     | Documentation only                   |
| `refactor/` | Code change without behaviour change |
| `perf/`     | Performance improvement              |
| `test/`     | Tests only                           |
| `ci/`       | Continuous integration               |
| `chore/`    | Tooling, dependencies, maintenance   |

The topic is in kebab-case, for example `feat/reading-view`.

## Commit messages

- Imperative mood: `Add`, `Fix`, `Remove` (not `Added`, `Fixes`).
- Start with a capital letter.
- No prefix (`feat:`, `fix:`…): the type lives in the branch name.
- No trailing punctuation.
- Subject line of 72 characters at most.
- Code, file and library names go between backticks.

```
Add `note-link` to the Typst package
Handle accents in file names
Configure `eslint.config.js` with tab indentation
```

A `commit-msg` hook and the CI check these rules, except the imperative mood
beyond the most common mistakes, which is left to review.

## History

The history of `main` is linear: no merge commits.

- Pull requests are merged with **Rebase and merge** only; the branch is
  deleted afterwards.
- Update a branch with `git rebase main`, never `git merge`.
- Set `git config pull.rebase true` locally.
- Clean up your commits (`git rebase -i`) before asking for review.

## Changelog and versioning

- The project follows [Semantic Versioning](https://semver.org/). Versions
  stay at `0.x.y` until the first stable release.
- [`CHANGELOG.md`](./CHANGELOG.md) follows
  [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/).
- Every pull request that changes the application updates the `[Unreleased]`
  section. Pull requests that do not affect users (CI, tooling, internal
  documentation) carry the `no-changelog` label. The CI checks it.
- A release moves `[Unreleased]` to a new `[X.Y.Z] - YYYY-MM-DD` section and
  tags `vX.Y.Z`.
