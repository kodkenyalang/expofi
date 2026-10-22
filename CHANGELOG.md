# Changelog

All notable changes to ExpoFi, newest first. One entry per push to `main` on [GitHub](https://github.com/kodkenyalang/expofi). Each entry lists the commits it carried.

**Timestamps:**

- **Pushed** is when `main` moved on GitHub. Taken from the repository activity log and cross-checked against the local `origin/main` reflog; the two agree to within 1 second.
- **Committed** is the git committer date of each commit.
- Times are local (Asia/Kuala_Lumpur, UTC+08:00), with UTC alongside.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). There are no version tags yet: entries are identified by push and commit hash.

To check or extend this file:

```bash
git log --reverse --format='%h %cI %s'
git reflog show --date=iso-strict origin/main
gh api repos/kodkenyalang/expofi/activity -q '.[] | "\(.timestamp) \(.activity_type) \(.before[0:7])..\(.after[0:7])"'
gh run list --json headSha,databaseId,conclusion,createdAt
```

---

## [Unreleased]

Written 2026-10-22. A file can't record the hash or push time of the commit that adds it, so this entry gets its timestamps in the next update.

### Added

- `docs/interviews/`: interview kit for the current constraint (M10 = 0). A 16-question script mapped to the four open product decisions, an anonymised note template, and privacy rules for a public repo.
- `docs/GENCHI_GENBUTSU.md`: audit 3 (deep and wide on days 1–3), with probe output, the mutation sweep, the toolchain flip traced across layers, and fresh-clone vs local keypair.
- `KAIZEN.md`: Day 3 measurements; new metrics M13 (mutation score) and M14 (member cost); TC1 checkpoint (met except interviews), Cycle 1 hansei, Cycle 2 changes; newspaper rows K18–K27.
- `docs/ARCHITECTURE.md`: error-code table (append-only rule), costs and limits per instruction, concurrency, keypair handling, 9 new test rows, three decisions.

### Changed

- K14 and K16 closed. `README.md`, `anchor/README.md`, `CLAUDE.md`, `docs/ROADMAP.md`, `.superstack/build-context.md` updated to 22 tests, 19/19 mutants, and the new guard.

### Fixed

- `AGENT.md` said a steward `forgive` path exists. It is designed, not built (K25).

---

## 2026-10-22 16:12:48 +08:00 (08:12:48 UTC): Kaizen days 4–5: hardening, guard fix, CI update

**Push:** `2a125a2..35e1bb1` to `main` · **CI:** [run 39746072066](https://github.com/kodkenyalang/expofi/actions/runs/39746072066) ✅ success (08:12:50 → 08:13:35 UTC)

| Commit    | Committed                                 | Message                                                               | Size                |
| --------- | ----------------------------------------- | --------------------------------------------------------------------- | ------------------- |
| `35e1bb1` | 2026-10-22 16:12:37 +08:00 (08:12:37 UTC) | Build Kaizen days 4-5: harden program, fix toolchain guard, update CI | 7 files, +560 / −64 |

### Added

- 9 LiteSVM tests (13 → 22): forged parent lot, byte limits including a CJK boundary, note limits, double init, non-member borrow, stale `lot_count` then retry, pre-funded PDAs (lamport griefing), emptying a lot, and a 40,000 compute-unit budget.
- `WrongLot` error (6012) for a return that names a different parent lot. Appended, so 6000–6011 are unchanged.
- `scripts/mutation-check.py` and `npm run program-mutants`: removes each of 19 rules in turn and exits 1 if any survives. 15/19 → 19/19 killed.
- `package.json` `engines`: Node ≥ 20.18.

### Changed

- `npm run anchor-check` runs `anchor` from `anchor/`, checks `anchor-lang` = `[toolchain] anchor_version` = CLI and the active Solana CLI = `solana_version`, and warns when a `target/deploy` keypair doesn't match `declare_id!`.
- CI: `actions/checkout` v7, `actions/setup-node` v7, `actions/cache` v6 (Node 24); runner pinned to `ubuntu-24.04`; the Solana version is read from `Anchor.toml` instead of a duplicated literal.
- Error messages state text limits in bytes.

### Fixed

- The Day 1 guard switched the machine's Solana CLI to 3.1.10 whenever it ran at the repo root (K19).
- CI deprecation warnings for Node 20 actions and the `ubuntu-latest` migration (K16).

---

## 2026-10-21 19:57:02 +08:00 (11:57:02 UTC): Changelog

**Push:** `97bacde..2a125a2` to `main` · **CI:** [run 39595772005](https://github.com/kodkenyalang/expofi/actions/runs/39595772005) ✅ success (11:57:04 → 11:57:38 UTC)

| Commit    | Committed                                 | Message                                       | Size          |
| --------- | ----------------------------------------- | --------------------------------------------- | ------------- |
| `2a125a2` | 2026-10-21 19:56:59 +08:00 (11:56:59 UTC) | Add CHANGELOG with timestamped entry per push | 2 files, +129 |

### Added

- `CHANGELOG.md`: one entry per push, built from git history, the push reflog, GitHub's activity log, and CI runs. Linked from the README.

---

## 2026-10-21 19:25:40 +08:00 (11:25:40 UTC): Docs for Kaizen days 1–3

**Push:** `4d8d24b..97bacde` to `main` · **CI:** [run 39591875273](https://github.com/kodkenyalang/expofi/actions/runs/39591875273) ✅ success (11:25:42 → 11:26:21 UTC)

| Commit    | Committed                                 | Message                         | Size                 |
| --------- | ----------------------------------------- | ------------------------------- | -------------------- |
| `97bacde` | 2026-10-21 19:25:30 +08:00 (11:25:30 UTC) | Update docs for Kaizen days 1-3 | 9 files, +382 / −145 |

### Added

- `docs/GENCHI_GENBUTSU.md`: audit 2, with the command output for the Anchor install, the version guard, the program tests, the mutation check, and the first CI run.
- `KAIZEN.md`: Day 2 measurements for all 12 metrics, TC1 progress, and newspaper rows K9–K17 (problems found while building).
- `README.md`: CI badge, status table, a verified Anchor 1.1.2 install path (`otter-sec/anchor`, `--from-source` when GLIBC < 2.39), and the new scripts.
- `docs/ARCHITECTURE.md`: `seed_library` as built: accounts, rules and their errors, the test matrix, and three decisions.

### Changed

- `AGENT.md`: the current constraint is now access to seed-library coordinators (0 of 5 interviews), not the toolchain. The pre-push gate is `npm run ci` + `npm run program-test`.
- `CLAUDE.md`: rules against running two `cargo` commands at once, and for using `pipefail` when piping long commands.
- `KAIZEN.md`: K3, K4 and K8 closed (status A).
- `anchor/README.md`, `docs/ROADMAP.md`, `.superstack/build-context.md` (`tests_passing: true`).

### Fixed

- README told people to install avm from `solana-foundation/anchor`. Replaced with the `otter-sec/anchor` source that the install actually used (K11).
- README claimed borrowing is blocked by an "open or failed" loan. Only open loans block, which is what the program does.

---

## 2026-10-21 19:17:54 +08:00 (11:17:54 UTC): Kaizen days 1–3: toolchain guard, CI, `seed_library` core

**Push:** `a5a9716..4d8d24b` to `main` · **CI:** [run 39590915650](https://github.com/kodkenyalang/expofi/actions/runs/39590915650) ✅ success, first ever run (11:18:00 → 11:22:01 UTC)

| Commit    | Committed                                 | Message                                                       | Size                  |
| --------- | ----------------------------------------- | ------------------------------------------------------------- | --------------------- |
| `4d8d24b` | 2026-10-21 19:17:50 +08:00 (11:17:50 UTC) | Build Kaizen days 1-3: toolchain guard, CI, seed_library core | 16 files, +1,087 / −2 |

### Added

- **`seed_library` Anchor program** (`anchor/programs/seed_library/`, ID `EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby`, not deployed):
  - `init_library`, `join`, `add_lot`, `borrow`, `return_lot`.
  - On-chain borrow gate: a member with an open loan can't borrow (`BorrowBlocked`).
  - `return_lot` creates a child lot whose `parent` is the borrowed lot, at `generation + 1`.
  - 13 LiteSVM tests that assert exact error codes, including cross-library substitution, a non-borrower return, and a double return. Deleting the borrow gate makes its test fail.
- `scripts/check-anchor-version.mjs` and `npm run anchor-check`: stops if `anchor --version` doesn't match the programs' `anchor-lang`. `anchor-build` and `setup` run it first.
- `npm run program-test`: `cargo build-sbf` + LiteSVM tests, no Anchor CLI needed.
- `.github/workflows/ci.yml`: a web job (`npm ci`, build, lint, format) and a program job (rustfmt on `seed_library`, `cargo build-sbf`, LiteSVM tests).

### Changed

- `anchor/Anchor.toml`: pinned `anchor_version = "1.1.2"` and `solana_version = "3.1.14"` under `[toolchain]`, so avm uses the installed Solana CLI instead of switching to 3.1.10. Registered `seed_library` under `[programs.devnet]`.
- `package.json`: `anchor-build` and `anchor-test` now go through the version guard.

---

## 2026-10-20 21:06:25 +08:00 (13:06:25 UTC): 30-day Kaizen plan

**Push:** `79a47d1..a5a9716` to `main` · **CI:** none (CI was added in the next push)

| Commit    | Committed                                 | Message                                     | Size          |
| --------- | ----------------------------------------- | ------------------------------------------- | ------------- |
| `a5a9716` | 2026-10-20 21:06:15 +08:00 (13:06:15 UTC) | Add 30-day Kaizen plan and kaizen newspaper | 3 files, +129 |

### Added

- `KAIZEN.md`: a 30-day plan (20 Oct to 18 Nov 2026) built from kaizen event follow-up practice (30/60/90-day reviews), the Toyota Improvement Kata, and a kaizen newspaper. It has 12 baseline metrics, 4 dated target conditions, and newspaper rows K1–K8.

### Changed

- `AGENT.md` and `README.md` link to `KAIZEN.md`.

---

## 2026-10-18 22:12:40 +08:00 (14:12:40 UTC): Initial scaffold, audit, and docs

**Push:** created `main` at `79a47d1` (first push to the empty public repository) · **CI:** none

| Commit    | Committed                                 | Message                                                     | Size              |
| --------- | ----------------------------------------- | ----------------------------------------------------------- | ----------------- |
| `79a47d1` | 2026-10-18 22:12:31 +08:00 (14:12:31 UTC) | Scaffold ExpoFi with genchi genbutsu audit and project docs | 97 files, +36,004 |

### Added

- The `create-solana-dapp` `kit/nextjs-anchor` template: Next.js, `@solana/kit`, wallet-standard, the template Anchor `vault` program, and its Codama client.
- Docs: `README.md`, `AGENT.md` (Solana skills and working principles), `CLAUDE.md`, `docs/PRODUCT.md`, `docs/A3.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/GENCHI_GENBUTSU.md` (audit 1).
- Agent setup: `.mcp.json` (Solana Developer MCP), `.superstack/build-context.md`, and the `solana-dev` skill linked into `.claude/skills/`.

### Fixed

- A broken dependency tree from an interrupted `npm install` (the lockfile was out of sync and ESLint crashed) was repaired with `npm install`.
- `anchor build` on Anchor CLI 0.30.1 had rewritten `declare_id!` and `Anchor.toml` to a new key. Both were restored to the template's devnet ID.

### Security

- `next` and `eslint-config-next` bumped from 16.3.4 to 16.4.2. This cleared 7 Next.js advisories, including a critical RCE (GHSA-vcvr-r3jv-pc5j). Production `npm audit`: 0 vulnerabilities.
