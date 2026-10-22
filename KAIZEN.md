# KAIZEN.md

30-day continuous-improvement plan for ExpoFi, running from **Tue 20 Oct 2026 (Day 1) to Wed 18 Nov 2026 (Day 30)**. It covers hackathon weeks 2–4 (submission around Sun 8 Nov, Day 20) and a 10-day sustain period after submission.

This file is the working log. The principle lives in [AGENT.md](AGENT.md#kaizen-改善), and the first-hand audit that set the baseline is [docs/GENCHI_GENBUTSU.md](docs/GENCHI_GENBUTSU.md).

---

## 1. What the research says

There is no canonical "30-day kaizen plan" in the Lean literature. This plan combines four practices that are well documented:

| Practice                      | What it contributes                                                                                                                                                                                                                                                         | Source                                                                                                                                                                                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kaizen event phases**       | A focused burst runs Train → Observe → Design → Implement → Verify. The report-out is an A3 with before/after metrics and a **30-day sustain plan**.                                                                                                                        | [Fabrico](https://www.fabrico.io/sr/blog/how-to-run-successful-kaizen-event-blitz-manufacturing-guide/), [Manifest.ly](https://app.manifest.ly/public/checklists/4a5c085ceaf11369672244f8f2575869)                                                            |
| **Follow-up decides results** | Gains erode once the team celebrates and moves on. Weekly 30–60 minute follow-up meetings stabilise the change. Reviews at **30, 60, 90** (or 30/90/180) days catch drift while it is still cheap to fix.                                                                   | [Reliable Plant](https://www.reliableplant.com/Articles/Print/10114), [Taylor & Francis](https://www.taylorfrancis.com/books/9781439827826/chapters/10.1201/b16808-27), [Fabrico](https://www.fabrico.io/bg/blog/why-kaizen-events-fail-structural-critique/) |
| **Kaizen newspaper**          | A visible action log (problem → countermeasure → owner → due → status), audited at 30/60/90 days.                                                                                                                                                                           | [Open Exam Prep](https://open-exam-prep.com/study-guides/cssyb/improve-techniques/kaizen-and-kaizen-blitz), [Minitab 30-60-90](https://support.minitab.com/en-us/workspace/help-and-how-to/forms/types-of-forms/project-management/30-60-90-action-plan)      |
| **Toyota Improvement Kata**   | Four steps: understand the direction → grasp the current condition → set the next **target condition** → run PDCA experiments toward it. Targets are absolute numbers with an expiry date, set just beyond current knowledge. Works with software teams and retrospectives. | [Methods & Tools](https://www.methodsandtools.com/archive/toyotakata.php), [KaiNexus](https://blog.kainexus.com/what-is-a-target-condition), [Methods Mentor](https://methodsmentor.substack.com/p/revitalizing-agile-retrospectives)                         |

How these map onto a 30-day software sprint:

- The **direction** is the hackathon goal.
- **Target conditions** are weekly, measurable, and expire at each checkpoint.
- **PDCA** runs daily (one experiment = one small commit).
- The **kaizen newspaper** is section 6 of this file.
- **Follow-ups** at Day 30, 60, and 90 check for drift after the hackathon ends.

---

## 2. Direction (the challenge)

> By **Sun 8 Nov 2026**, a stranger completes _borrow → blocked borrow → return → lineage_ on devnet, unassisted, in under 3 minutes. A 2–4 minute video shows it, with a real seed-library coordinator's problem as the opening.

## 3. Current condition (measured Day 1, re-measured Days 2 and 3)

Every number comes from a command or a count, not an estimate. Re-measure at each target-condition expiry.

| #   | Metric                                      | How measured                                       | Day 1           | Day 2 (21 Oct)                             | Day 3 (22 Oct)           |
| --- | ------------------------------------------- | -------------------------------------------------- | --------------- | ------------------------------------------ | ------------------------ |
| M1  | Anchor CLI major version                    | `anchor --version`                                 | 0.30.1 (need 1) | 1.1.2 ✓                                    | 1.1.2 ✓                  |
| M2  | `npm run setup` passes                      | exit code                                          | ✗               | ✓                                          | ✓                        |
| M3  | `seed_library` instructions implemented     | count in `programs/seed_library/src/instructions/` | 0 / 7           | 5 / 7                                      | 5 / 7                    |
| M4  | `seed_library` LiteSVM tests passing        | `cargo test`                                       | 0               | 13                                         | 22                       |
| M5  | ExpoFi program deployed to devnet (our key) | `solana program show <id> --url devnet`            | ✗               | ✗                                          | ✗                        |
| M6  | CI on every push                            | GitHub Actions status                              | none            | green (web 52 s, program 4 min)            | green (41 s, warm cache) |
| M7  | Lint warnings                               | `npx eslint`                                       | 3               | 3                                          | 3                        |
| M8  | Rust compiler warnings                      | `cargo test` output                                | 3               | 3 (all template `vault`; `seed_library` 0) | 3 (all template `vault`) |
| M9  | Prod dependency vulnerabilities             | `npm audit --omit=dev`                             | 0               | 0                                          | 0                        |
| M10 | Seed-library coordinators interviewed       | interview notes in `docs/interviews/`              | 0               | 0                                          | 0                        |
| M11 | Unassisted stranger completions of the flow | observed sessions                                  | 0               | 0                                          | 0                        |
| M12 | Template code still present (vault, hero)   | files and strings                                  | yes             | yes                                        | yes                      |
| M13 | Mutation score (rules guarded by a test)    | `npm run program-mutants`                          | —               | —                                          | 15 / 19 → **19 / 19**    |
| M14 | Cost to a member per borrow + return        | LiteSVM balance delta (rent, excl. tx fees)        | —               | —                                          | 0.00629 SOL, locked      |

## 4. Target conditions

Each has an expiry date. A missed target is not a failure. It is data for the next PDCA cycle (Act).

| TC  | Expires (day)       | Target condition (absolute)                                                                                                                                 | Hackathon gate          |
| --- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| TC1 | Sun 25 Oct (Day 6)  | M1 = 1.x · M2 ✓ · M3 ≥ 5/7 (`init_library`, `join`, `add_lot`, `borrow`, `return_lot`) · M4 ≥ 6 incl. blocked borrow and double return · M6 green · M10 ≥ 3 | Plan DCP (week 2)       |
| TC2 | Sun 1 Nov (Day 13)  | M3 = 7/7 · M5 ✓ · Codama client regenerated · seed-library UI replaces template · M12 = no · M7 = 0 · M8 = 0 · M10 ≥ 5 · M11 ≥ 1                            | Checkpoint demo (wk 3)  |
| TC3 | Sun 8 Nov (Day 20)  | M11 ≥ 3 in < 3 min each · video recorded · submission filed · genchi genbutsu re-run and appended                                                           | Availability DCP (wk 4) |
| TC4 | Wed 18 Nov (Day 30) | No regressions: M6 green, M7 = 0, M8 = 0, M9 = 0 · hansei (reflection) written · Day-60 target set                                                          | 30-day review           |

### Progress against TC1 (checked Wed 21 Oct, Day 2)

Plan days 1–3 were built on calendar Day 2, one day ahead. TC1 is met on every program and toolchain metric (M1, M2, M3 ≥ 5/7, M4 ≥ 6 including blocked borrow and double return, M6 green). The one miss is **M10 = 0 interviews (target ≥ 3)**.

**The constraint has moved** (Theory of Constraints): it is no longer the toolchain, it is access to real seed-library coordinators. Until M10 moves, don't build further ahead of the product. `forgive`, the steward-approval question, and the return flow all depend on what coordinators say.

### TC1 checkpoint (plan days 4–6, reviewed Thu 22 Oct, Day 3)

Plan days 4–6 were built on calendar Day 3, three days before TC1 expires. They started with a deep, wide genchi genbutsu (audit 3 in docs/GENCHI_GENBUTSU.md) and fixed what it found.

| TC1 condition                                   | Target  | Actual (22 Oct)              | Met? |
| ----------------------------------------------- | ------- | ---------------------------- | ---- |
| M1 Anchor CLI                                   | 1.x     | 1.1.2                        | ✅   |
| M2 `npm run setup`                              | ✓       | ✓                            | ✅   |
| M3 instructions                                 | ≥ 5 / 7 | 5 / 7                        | ✅   |
| M4 tests incl. blocked borrow and double return | ≥ 6     | 22, and 19/19 mutants killed | ✅   |
| M6 CI                                           | green   | green                        | ✅   |
| M10 coordinator interviews                      | ≥ 3     | **0**                        | ❌   |

**Verdict:** TC1 is met on every engineering condition and **missed on the one that matters most**. Following the Improvement Kata, a missed target is data, not failure: the obstacle is buyer access, and an interview kit now exists (`docs/interviews/`). M10 carries into TC2 (≥ 5 by 1 Nov).

**Hansei (Cycle 1 reflection):**

- We built the program three days ahead and talked to nobody. The constraint was named on Day 2 and still not worked. Engineering is the comfortable work; the kit makes the uncomfortable work cheaper, but someone has to send the messages.
- Two of our own Day 1 countermeasures had defects that only a second, wider look found: the guard switched the machine's Solana CLI (K19), and the tests left 4 rules unguarded (K18). **Standardise:** re-audit every countermeasure one cycle after it ships, and run `npm run program-mutants` whenever a rule changes.
- Network failures (K9, K24) caused more lost time than code did. Assume the network is hostile: `pipefail`, retries, `--prefer-offline`.

**Changes to Cycle 2 from this checkpoint:**

1. **Before the first devnet deploy** (account layouts are cheap to change now and expensive after): decide K22, whether a sponsor can pay rent (separate `payer` signer) and whether loans close after return. This is interview question 11–12.
2. Client rule from K23: re-read `lot_count` and retry on `2006 ConstraintSeeds`.
3. UI must count bytes, not characters, for names and notes (K21).
4. Keep M13 at 19/19 or better as rules are added (`forgive` adds mutants).

## 5. The 30-day plan

### Daily (≤ 15 min): the five coaching questions

Asked at the start of each working session, answered in the newspaper (section 6) when something changes:

1. What is the **target condition**?
2. What is the **actual condition** now? (go and see: run it, don't recall it)
3. What **obstacles** stand in the way? Which **one** are you working on now?
4. What is your **next step** (one experiment)? What do you **expect** to happen?
5. When can we **go and see** what we learned from that step?

One experiment = one small commit with a before/after number in the message when there is one.

### Weekly (30–60 min, Sunday): PDCA review

- **Check:** re-measure M1–M12 and update the table in section 3 as a new dated column.
- **Act:** standardise what worked (scripts, AGENT.md rules), and drop what didn't.
- **Plan:** confirm or reset the next target condition. Re-identify the constraint (Theory of Constraints).
- Re-run the genchi genbutsu audit at TC2 and TC3.

### Cycle-by-cycle

| Days                    | PDCA cycle                       | Focus (constraint)          | Experiments (each one small, each one measured)                                                                                                                                                                                               |
| ----------------------- | -------------------------------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1–6** (20–25 Oct)     | Cycle 1: make the line run       | Toolchain → program core    | `avm install 1.1.2`; version-guard script (poka-yoke); scaffold `seed_library`; `init_library`, `join`, `add_lot`, `borrow` gate, `return_lot` child lot; LiteSVM tests per rule; GitHub Actions CI; 3 coordinator interviews                 |
| **7–13** (26 Oct–1 Nov) | Cycle 2: make it real            | Devnet + UI                 | `forgive`, `attest_germination`; own keypair and devnet deploy; Codama regen; replace template UI (Library, Lot + lineage, Borrow, Return, My loans); failure screens; delete vault (5S Seiri); zero warnings (5S Seiso); first stranger test |
| **14–20** (2–8 Nov)     | Cycle 3: make it understood      | Stranger completion → video | Fix the top obstacle from each stranger test (one per day); chaos tests (RPC down, wallet reject, blockhash expiry); `/review-and-iterate`, `/cso`; record video; `/submit-to-hackathon`                                                      |
| **21–30** (9–18 Nov)    | Cycle 4: make it stick (sustain) | Drift prevention            | Hansei (what we'd do differently); turn remaining manual checks into CI; update AGENT.md rules; prune docs that no longer match reality; set Day-60 target condition                                                                          |

## 6. Kaizen newspaper

The action log. Add a row per problem, and never delete rows. Status uses the PDCA quarter it has reached: **P** (planned), **D** (doing), **C** (checking), **A** (standardised, closed).

| #   | Date       | Problem (observed)                                                                                                | Root cause                                                                                                  | Countermeasure                                                                                                           | Before → After                                      | Owner | Due        | Status |
| --- | ---------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------- | ----- | ---------- | ------ |
| K1  | 2026-10-18 | ESLint crashed: `Cannot find module '@nodelib/fs.scandir'`                                                        | Interrupted `npm install`; lockfile out of sync                                                             | `npm install`; verify with `npm ci --dry-run`                                                                            | lint crash → 0 errors                               | team  | 2026-10-18 | A      |
| K2  | 2026-10-18 | `next@16.3.4`: 7 advisories, 1 critical RCE                                                                       | Template pinned a vulnerable minor                                                                          | Bump `next` and `eslint-config-next` to 16.4.2                                                                           | prod vulns 7 → 0                                    | team  | 2026-10-18 | A      |
| K3  | 2026-10-18 | `anchor build` rewrote `declare_id!` and `Anchor.toml`                                                            | Anchor CLI 0.30.1 vs program on 1.x; no version check                                                       | Restored ID; `npm run anchor-check` guard runs before every Anchor build (21 Oct)                                        | ID mismatch → guard blocks 0.30.1, no IDs rewritten | team  | 2026-10-18 | A      |
| K4  | 2026-10-18 | `npm run setup` fails: `unexpected argument '--ignore-keys'`                                                      | Same as K3                                                                                                  | avm 1.1.2 from `otter-sec/anchor`, Anchor built from source; guard script                                                | M1 0.30.1 → 1.1.2; M2 ✗ → ✓                         | team  | 2026-10-21 | A      |
| K5  | 2026-10-18 | 3 lint warnings                                                                                                   | Template code                                                                                               | Fix or delete with template removal                                                                                      | M7 3 → 0                                            | team  | 2026-11-01 | P      |
| K6  | 2026-10-18 | 3 Rust warnings in `tests.rs`                                                                                     | Unused `Result` from `svm.add_program`                                                                      | Handle results in new tests; delete vault tests with template                                                            | M8 3 → 0                                            | team  | 2026-11-01 | P      |
| K7  | 2026-10-18 | 0 buyer interviews                                                                                                | Building started before talking to buyers                                                                   | Contact 5 seed libraries / allotment societies                                                                           | M10 0 → 5                                           | team  | 2026-10-25 | P      |
| K8  | 2026-10-18 | No CI; `npm ci` failure was invisible for days                                                                    | No automated gate                                                                                           | `.github/workflows/ci.yml`: web job + program job (rustfmt, build-sbf, LiteSVM)                                          | M6 none → green on first run                        | team  | 2026-10-25 | A      |
| K9  | 2026-10-20 | avm install "succeeded" but installed nothing                                                                     | Transient DNS failure for github.com; piping into `tail` hid the exit code                                  | Retry; `set -o pipefail` for piped long commands (CLAUDE.md rule)                                                        | silent failure → visible                            | team  | 2026-10-21 | A      |
| K10 | 2026-10-20 | `cargo build-sbf` stalled > 10 min                                                                                | Concurrent `cargo install` held Cargo's package-cache lock                                                  | Never run two cargo commands at once (CLAUDE.md rule)                                                                    | > 10 min stall → 4 s build                          | team  | 2026-10-21 | A      |
| K11 | 2026-10-21 | README told people to install avm from `solana-foundation/anchor`                                                 | Docs written from memory, not checked against the solana-dev skill                                          | Install from `otter-sec/anchor` (verified by doing it)                                                                   | wrong URL → verified URL                            | team  | 2026-10-21 | A      |
| K12 | 2026-10-21 | Prebuilt Anchor 1.x can't run here                                                                                | Ubuntu 22.04 has GLIBC 2.35; prebuilt Anchor ≥ 0.31 needs 2.39                                              | `avm install 1.1.2 --from-source` (~10 min), documented in README                                                        | — → works                                           | team  | 2026-10-21 | A      |
| K13 | 2026-10-21 | After `avm use 1.1.2`, `anchor --version` still said 0.30.1                                                       | Old cargo-installed anchor in `~/.cargo/bin` shadowed avm's shim, which lives in `~/.avm/bin` (not on PATH) | `cargo uninstall anchor-cli`; symlink `~/.cargo/bin/anchor` → avm                                                        | 0.30.1 → 1.1.2                                      | team  | 2026-10-21 | A      |
| K14 | 2026-10-21 | avm 1.1.2 shim tried to switch the Solana CLI to 3.1.10                                                           | No `[toolchain]` pin, so avm fell back to Anchor's recommended Solana                                       | Pin `anchor_version` and `solana_version` in `Anchor.toml`. Outside this project the shim still wants 3.1.10             | unwanted switch → 3.1.14 kept                       | team  | 2026-10-25 | A      |
| K15 | 2026-10-21 | `npm run setup` rewrites `app/generated/vault/*` (format only)                                                    | Codama renders with its own Prettier settings, not `.prettierrc`                                            | Decide when generating the `seed_library` client: format output with repo Prettier, or accept Codama style               | 6 noisy files → 0                                   | team  | 2026-11-01 | P      |
| K16 | 2026-10-21 | CI warnings: Node 20 actions deprecated; `ubuntu-latest` moving to Ubuntu 26                                      | Action majors and runner label not pinned to current versions                                               | Bump to Node 24 action majors; pin `ubuntu-24.04`                                                                        | 2 annotations → 0                                   | team  | 2026-10-25 | A      |
| K17 | 2026-10-21 | Workspace not rustfmt-clean                                                                                       | Template `vault` code                                                                                       | CI checks `seed_library` only; widen to `--all` when vault is deleted                                                    | 1 program → all                                     | team  | 2026-11-01 | P      |
| K18 | 2026-10-22 | 4 of 19 mutants survived: the lineage rule (`has_one = lot`), variety and note limits had no test                 | Tests written for the happy path and named failures only                                                    | 9 tests; `WrongLot` error; `npm run program-mutants` exits 1 on any survivor                                             | M13 15/19 → 19/19                                   | team  | 2026-10-22 | A      |
| K19 | 2026-10-22 | Our own guard (`anchor-check`) switched the machine's Solana CLI to 3.1.10                                        | It ran `anchor` at the repo root, where avm has no `Anchor.toml` and uses its global default                | Guard runs from `anchor/`, checks both pins, re-activates 3.1.14 if the machine drifted                                  | flip on every check → none                          | team  | 2026-10-22 | A      |
| K20 | 2026-10-22 | The program keypair existed only in `target/deploy/`; a fresh clone generates a different one (`82xu…` ≠ `EqkK…`) | `target/` is gitignored and deletable; nothing checked keypair against `declare_id!`                        | Backup in `~/.config/solana/expofi/` (600); guard warns on mismatch. Sharing with teammates still needs a secure channel | 1 copy → 2; silent → warned                         | team  | 2026-10-28 | C      |
| K21 | 2026-10-22 | Errors said "characters", limits are bytes: a 12-character CJK variety was rejected                               | `String::len()` counts bytes; message written from intent                                                   | Messages state bytes; test covers CJK boundary. UI must count bytes (Cycle 2)                                            | wrong message → right                               | team  | 2026-11-01 | C      |
| K22 | 2026-10-22 | A member pays 0.00629 SOL rent per borrow + return, locked forever, and nobody else can pay it                    | Every `init` uses the member's wallet as payer; no account closes                                           | Decide before deploy: separate `payer` signer for sponsorship; close `Loan` after return. Ask coordinators (Q11–12)      | M14 0.00629 SOL → decide                            | team  | 2026-10-28 | P      |
| K23 | 2026-10-22 | Two lot-creating transactions built from the same `lot_count` → the second fails `2006`                           | Lot ids are a per-library sequence, so creation serialises on the Library account                           | Test documents it; client must re-read and retry                                                                         | unknown → tested                                    | team  | 2026-11-01 | C      |
| K24 | 2026-10-22 | Network: fetches took 12–130 s, `npm ci` ETIMEDOUT, `cargo audit` couldn't fetch the advisory DB                  | Local network (WSL)                                                                                         | Retried with `--prefer-offline`; `cargo audit --no-fetch` against a 5-day-old DB. Move `cargo audit` into CI             | audit stale → fresh in CI                           | team  | 2026-11-01 | P      |
| K25 | 2026-10-22 | AGENT.md said a steward "forgive" path exists; it doesn't                                                         | Principles doc written as if the design were built                                                          | Corrected wording                                                                                                        | false claim → 0                                     | team  | 2026-10-22 | A      |
| K26 | 2026-10-22 | No branch protection, Dependabot alerts off, no license                                                           | Repo defaults                                                                                               | Owner's call: turn on Dependabot + branch protection on `main`; choose a license                                         | 3 gaps → decide                                     | owner | 2026-11-01 | P      |
| K27 | 2026-10-22 | Stale `vault-keypair.json` (`3FqZ…`) in `target/deploy` from the 18 Oct Anchor 0.30 build                         | Debris of K3                                                                                                | Guard warns; removed with the vault (5S Seiri, Cycle 2)                                                                  | 1 warning → 0                                       | team  | 2026-11-01 | P      |

## 7. Follow-up reviews (beyond the 30 days)

Gains erode after the event ends. These dates are fixed now so they don't get skipped:

| Review | Date            | Check                                                                                        |
| ------ | --------------- | -------------------------------------------------------------------------------------------- |
| Day 30 | Wed 18 Nov 2026 | TC4. Every newspaper row is A or has a new due date. Hansei written.                         |
| Day 60 | Fri 18 Dec 2026 | Metrics M6–M9 have not drifted. Accelerator outcome recorded. Next challenge chosen.         |
| Day 90 | Sun 17 Jan 2027 | Re-run genchi genbutsu end to end. Retire rules in AGENT.md that no longer earn their place. |

## 8. Rules of this log

1. **Small:** one improvement per commit. If it needs a paragraph to explain, split it.
2. **Measured:** a before → after number whenever one exists. "Felt faster" is not a measurement.
3. **Seen, not recalled:** the current condition comes from running the command (genchi genbutsu).
4. **Root cause, not blame:** the cause column names a process, tool, or assumption, never a person.
5. **Standardise or it didn't happen:** status A means the fix is in a script, CI, or an AGENT.md rule, not just in someone's head.
6. **Append only:** don't rewrite history. Add a dated column or row.
