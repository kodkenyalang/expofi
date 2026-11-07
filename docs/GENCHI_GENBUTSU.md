# Genchi Genbutsu audit

**Date:** 18 October 2026 (hackathon week 1)
**Method:** go and see each layer for real, then cross-check the layers against each other. Every finding below comes from a command that was actually run. Nothing comes from reading a README.

## Summary

| #   | Layer               | Finding                                                                                                                    | Severity | Status                                          |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------- |
| 1   | Repo                | Directory was not a git repository; `kodkenyalang/expofi` existed, public and empty                                        | Info     | Fixed: initialised and pushed                   |
| 2   | Dependencies        | `npm install` had been interrupted: lockfile out of sync, `@nodelib/fs.scandir` missing its `package.json`, ESLint crashed | High     | Fixed: `npm install` repaired tree and lock     |
| 3   | Dependencies        | `next@16.3.4` had 7 advisories, including a **critical RCE** (GHSA-vcvr-r3jv-pc5j)                                         | Critical | Fixed: `next` and `eslint-config-next` → 16.4.2 |
| 4   | Toolchain           | Anchor CLI **0.30.1** installed; program uses `anchor-lang 1.1.2`; `npm run setup` fails                                   | High     | Fixed 21 Oct: Anchor 1.1.2 (audit 2)            |
| 5   | Toolchain × Program | `anchor build` on 0.30.1 **silently rewrote** `declare_id!` and `Anchor.toml` to a new local key                           | High     | Reverted; guard script since 21 Oct (audit 2)   |
| 6   | Chain               | Template program `F4jZ…yXjB` is live on devnet, but its upgrade authority is not ours                                      | Info     | Must deploy our own program                     |
| 7   | Program             | 4/4 LiteSVM tests pass; 3 compiler warnings in `tests.rs`                                                                  | Low      | Open (5S: Seiso)                                |
| 8   | Client              | Lint: 0 errors, 3 warnings                                                                                                 | Low      | Open (5S: Seiso)                                |
| 9   | Product × UI        | UI and metadata are still the template ("Solana Starter Kit", "Anchor Vault"). No seed-library code exists yet             | Info     | Program started 21 Oct; UI open (Cycle 2)       |
| 10  | Skill × Code        | `solana-dev` skill defaults to `@solana/kit` 8; repo is on 6.10                                                            | Low      | Open: deliberate decision                       |
| 11  | Agent setup         | Skill lived only in `.agents/skills/`, which Claude Code does not auto-load                                                | Low      | Fixed: symlink in `.claude/skills/`             |
| 12  | Dev-only deps       | `braces` (high) via `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch`                               | Low      | Open: dev-only; `npm audit --omit=dev` = 0      |

## Layer by layer

### 1. Repository

```
$ git status
fatal: not a git repository (or any of the parent directories): .git
$ gh repo view kodkenyalang/expofi --json name,isEmpty,visibility
{"isEmpty":true,"name":"expofi","visibility":"PUBLIC"}
```

The repo is **public**. Anything committed is published, so `.gitignore` was checked first. It covers `.env*`, `anchor/target/` (where program keypairs live) and `node_modules`.

### 2. Dependencies: interrupted install

```
$ npx eslint
Error: Cannot find module '@nodelib/fs.scandir'
$ ls node_modules/@nodelib/fs.scandir
out            # no package.json
$ npm ci
npm error `npm ci` can only install packages when your package.json and package-lock.json ... are in sync.
npm error Missing: @babel/template@7.29.7 from lock file
...
```

**Fishbone root cause (Method):** the scaffold's `npm install` was cut off part-way. It left a half-written tree and lockfile, but `npm run build` still worked, so the problem was invisible until ESLint ran.
**Countermeasure:** `npm install` to repair, then confirmed with `npm ci --dry-run` (clean). CI should use `npm ci` so this can't hide again.

### 3. Dependencies: Next.js advisories

```
$ npm audit
next  16.0.0 - 16.3.7
Severity: critical
  Remote Code Execution in next/og ImageResponse      GHSA-vcvr-r3jv-pc5j  (>=16.2.0 <16.3.6)
  Cache poisoning of SSG and ISR pages                GHSA-4jqv-mc3x-m676  (<16.3.8)
  SSRF in Image Optimization                          GHSA-cjq9-62q9-8jv4  (<16.3.8)
  ... 4 more
```

Bumped `next` and `eslint-config-next` to `^16.4.2` (minor, non-breaking). After the bump:

```
$ npm run build     ✓ Compiled successfully
$ npm audit --omit=dev
found 0 vulnerabilities
```

### 4–5. Toolchain × program: the program-ID trap

```
$ anchor --version
anchor-cli 0.30.1
$ grep anchor-lang anchor/programs/vault/Cargo.toml
anchor-lang = "1.1.2"
$ npm run anchor-build
error: unexpected argument '--ignore-keys' found
```

Running plain `anchor build` (0.30.1) compiled successfully, **but**:

```
$ grep declare_id anchor/programs/vault/src/lib.rs
declare_id!("3FqZQ1U7WygGyhVZhbn1zQvHhkp4Kypfn71bj9VcXHmG")   # was F4jZ…yXjB
$ grep vault anchor/Anchor.toml
vault = "3FqZQ1U7WygGyhVZhbn1zQvHhkp4Kypfn71bj9VcXHmG"         # was F4jZ…yXjB
```

The program's source now disagreed with the generated client (`app/generated/vault/programs/vault.ts`) and with devnet. That is a **cross-sectional** defect: each layer looks fine on its own. Both files were restored to `F4jZpgbtTb6RWNWq6v35fUeiAsRJMrDczVPv9U23yXjB`. The program was rebuilt without Anchor touching keys:

```
$ cargo build-sbf --manifest-path programs/vault/Cargo.toml
    Finished `release` profile [optimized]
$ cargo test
test test_id ... ok
test tests::tests::test_withdraw_fails_if_vault_empty ... ok
test tests::tests::test_deposit_fails_if_vault_has_funds ... ok
test tests::tests::test_deposit_and_withdraw ... ok
test result: ok. 4 passed; 0 failed
```

**Fishbone root cause (Machine + Man):** the template assumes Anchor 1.x (`--ignore-keys`). The machine has 0.30.1, and nothing checks the version. **Countermeasure:** `avm install 1.1.2 && avm use 1.1.2`. Until then, AGENT.md forbids `anchor build` on 0.30.x (poka-yoke by rule; a script check is on the roadmap).

### 6. Chain: devnet

```
$ solana program show F4jZpgbtTb6RWNWq6v35fUeiAsRJMrDczVPv9U23yXjB --url devnet
Owner: BPFLoaderUpgradeab1e11111111111111111111111
Authority: 27X9yLUmv8rVBTpvJLpMuNN5U998BiBjp6kceJYdPDBo
Last Deployed In Slot: 428913287
Data Length: 191712 bytes
```

The template program is real and callable, but it belongs to the template authors. The ExpoFi program needs its own keypair and deploy (Week 2).

### 7–8. Code quality

```
$ npx eslint
app/components/vault-card.tsx   96:6  react-hooks/exhaustive-deps (walletLamports)
app/components/wallet-button.tsx 73:21 @next/next/no-img-element
app/lib/wallet/signer.ts        45:5  unused eslint-disable directive
✖ 3 problems (0 errors, 3 warnings)
$ npx tsc --noEmit         # clean
$ npx prettier --check .   # clean
```

`cargo test` also reports 3 warnings in `tests.rs` (unused `Result` from `svm.add_program`, and similar).

### 9. Product × UI

`app/layout.tsx` metadata: `title: "Solana dApp Starter"`. `app/page.tsx` header: `Solana Starter Kit`, hero: `Anchor Vault`. Only `package.json` mentions ExpoFi. **No seed-library code exists yet.** Every doc in this repo describes the target, and this file describes the reality.

### 10–11. Agent tooling

- `.agents/skills/solana-dev` (v2.7.0, hash-pinned in `skills-lock.json`) prefers `@solana/kit` 8 plugin clients. `node_modules/@solana/kit` is **6.10.0** and the latest is 8.5.0. Mixing the styles would be muda. Upgrade later as one deliberate change.
- Claude Code loads project skills from `.claude/skills/`, so a symlink was added there.

### Environment

| Tool       | Found                  |
| ---------- | ---------------------- |
| OS         | Linux (WSL2)           |
| Node / npm | 22.23.2 / 10.9.8       |
| Rust       | 1.95.0                 |
| Solana CLI | 3.1.14 (Agave), devnet |
| Anchor CLI | 0.30.1 (**needs 1.x**) |
| Surfpool   | not installed          |
| gh         | 2.96.0, authenticated  |

## Not yet seen (next audit)

- **The buyer.** No seed librarian has been interviewed. This is the most important unseen layer.
- Wallet flow in a real browser with Phantom/Solflare on devnet.
- Surfpool mainnet-fork testing (not installed).

Re-run this audit at every checkpoint. Append, don't overwrite.

---

# Audit 2: Kaizen plan days 1–3

**Date:** 21 October 2026 (calendar Day 2 of KAIZEN.md). Same method: every line below comes from a command that was run.

## Summary

| #   | Layer                 | Finding                                                                                                                          | Status                                             |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 13  | Network × Method      | First avm install "succeeded" but installed nothing: DNS failure for github.com, exit code hidden by `\| tail`                   | Retried; `pipefail` rule (K9)                      |
| 14  | Toolchain × Toolchain | `cargo build-sbf` stalled > 10 min behind a concurrent `cargo install` holding Cargo's package-cache lock                        | Serialise cargo commands (K10)                     |
| 15  | Docs × Reality        | README's avm source (`solana-foundation/anchor`) was from memory; the solana-dev skill and a real install say `otter-sec/anchor` | README fixed (K11)                                 |
| 16  | OS × Toolchain        | GLIBC 2.35 (Ubuntu 22.04) is below the 2.39 prebuilt Anchor 1.x needs                                                            | Built from source (K12)                            |
| 17  | PATH × Toolchain      | After `avm use 1.1.2`, `anchor` was still 0.30.1: an old cargo-installed binary shadowed avm's shim                              | Uninstalled; shim linked into `~/.cargo/bin` (K13) |
| 18  | Toolchain × Toolchain | avm 1.1.2's shim tried to switch the Solana CLI to 3.1.10 via `agave-install`                                                    | Pinned `[toolchain]` in `Anchor.toml` (K14)        |
| 19  | Client codegen        | `npm run setup` rewrote 6 generated vault files: formatting only (Codama's Prettier settings)                                    | Discarded; decide in Cycle 2 (K15)                 |
| 20  | CI                    | First run green. Annotations: Node 20 actions deprecated, `ubuntu-latest` → Ubuntu 26                                            | Logged (K16)                                       |
| 21  | Program               | `seed_library`: 5 instructions, 13 tests, 0 warnings, rustfmt clean. Borrow-gate test proven by mutation                         | Done                                               |

## Toolchain, layer by layer

```
$ ldd --version | head -1
ldd (Ubuntu GLIBC 2.35-0ubuntu3.15) 2.35
$ cargo install --git https://github.com/otter-sec/anchor --tag v1.1.2 avm --locked --force
    Replaced package `avm v0.30.1 (https://github.com/coral-xyz/anchor#c679b278)` with `avm v1.1.2 (https://github.com/otter-sec/anchor?tag=v1.1.2#24035e2b)`
$ avm install 1.1.2 --from-source && avm use 1.1.2
    Installed package `anchor-cli v1.1.2 (https://github.com/otter-sec/anchor?tag=v1.1.2#24035e2b)`
Now using anchor version 1.1.2.
$ which -a anchor; anchor --version
/home/aaron/.cargo/bin/anchor
anchor-cli 0.30.1                      # ← still the old one (finding 17)
```

After removing the shadowing binary, the shim ran but reached for a different Solana CLI:

```
$ anchor --version
Error: setting up Solana 3.1.10 resolved from recommended Solana for anchor 1.1.2 (global default (avm use))
    Failed to activate Solana 3.1.10 with `agave-install`
```

With `[toolchain] anchor_version = "1.1.2"` and `solana_version = "3.1.14"` in `anchor/Anchor.toml`:

```
$ avm solana resolve
solana 3.1.14 ([toolchain] solana_version in .../expofi/anchor/Anchor.toml)
$ anchor --version; solana --version
anchor-cli 1.1.2
solana-cli 3.1.14 (src:3134055b; feat:534737035, client:Agave)
```

**Cross-sectional note:** outside this repo, the shim still resolves Solana 3.1.10 as the global default. Running `anchor` in another directory may try to switch the machine's Solana CLI. Tracked as K14 (status C).

## Guard, then build

```
$ npm run anchor-check                 # with 0.30.1 installed
✖ Anchor version check failed
  Installed anchor-cli 0.30.1, but programs use anchor-lang 1.1.2.
$ npm run anchor-build; echo $?        # with 0.30.1 installed
1                                      # anchor never ran; no declare_id! or program ID changed
$ npm run anchor-build                 # with 1.1.2
✓ anchor-cli 1.1.2 matches anchor-lang 1.1.2
$ grep -h declare_id anchor/programs/*/src/lib.rs
declare_id!("EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby");   # unchanged
declare_id!("F4jZpgbtTb6RWNWq6v35fUeiAsRJMrDczVPv9U23yXjB");   # unchanged
$ npm run setup; echo $?
0                                      # first time this has passed (M2)
```

## Program

```
$ npm run program-test
test result: ok. 14 passed; 0 failed     # seed_library: 13 tests + Anchor's test_id
test result: ok. 4 passed; 0 failed      # template vault
$ cargo test -p seed_library 2>&1 | grep -c '^warning'
0
$ cargo fmt -p seed_library -- --check   # clean
```

Mutation check: replacing the borrow gate with a comment and rebuilding makes exactly one test fail:

```
test tests::tests::borrow_blocked_while_loan_open_and_reopens_after_return ... FAILED
```

Restored, rebuilt, and all 14 pass again.

## CI (GitHub Actions run 39590915650)

```
Web (build, lint, format):           success  52 s
Program (build-sbf, LiteSVM tests):  success  4 min  (13 seed_library tests listed in the log)
```

## Still not seen

- **The buyer.** 0 coordinator interviews. This is now the constraint (KAIZEN.md, TC1).
- The program on devnet, and a wallet signing a real `borrow` in a browser.
- Codama client for `seed_library` (needs a decision on K15 first).

---

# Audit 3: deep and wide, on days 1–3

**Date:** 22 October 2026 (calendar Day 3), before building plan days 4–6. **Deep:** every rule in the program is challenged, not just run. **Wide:** every layer from network to product, then cross-checked against each other and against the docs.

## Summary

| #   | Layer                 | Finding                                                                                                                                                  | Severity | Fixed in                                  |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------- |
| 22  | Toolchain × our guard | `npm run anchor-check` at the repo root switched the machine's Solana CLI to 3.1.10. The avm shim uses its global default where there's no `Anchor.toml` | High     | Day 5: guard runs from `anchor/` (K19)    |
| 23  | Tests                 | Mutation sweep: 15/19 killed. Survivors: lineage (`has_one = lot`), variety limit, two note limits                                                       | High     | Day 4: 9 tests, 19/19 (K18)               |
| 24  | Repo × keypair        | Program keypair existed only in gitignored `target/deploy/`. A fresh clone's `build-sbf` silently generated a different one (`82xu…`)                    | High     | Day 5: backup + guard warning (K20)       |
| 25  | Product × program     | Member pays 0.00629 SOL rent per borrow + return, locked forever; nobody else can pay                                                                    | Medium   | Decision before deploy (K22)              |
| 26  | Program × users       | Error messages said "characters"; limits are bytes. 12 CJK characters (36 bytes) rejected                                                                | Medium   | Day 4: messages + CJK test (K21)          |
| 27  | Distributed           | Two lot creations from one `lot_count` → second fails `2006 ConstraintSeeds`                                                                             | Medium   | Day 4: test; client retry rule (K23)      |
| 28  | Program               | Forged parent lot rejected only by generic `2001`                                                                                                        | Low      | Day 4: `WrongLot` (6012)                  |
| 29  | CI                    | Node 20 actions, `ubuntu-latest` migration, Solana version duplicated in CI and `Anchor.toml`                                                            | Low      | Day 5: v7/v7/v6, `ubuntu-24.04`, read pin |
| 30  | Docs × reality        | AGENT.md said a `forgive` path exists                                                                                                                    | Low      | Day 6 (K25)                               |
| 31  | Repo settings         | No `engines`; no branch protection; Dependabot off; no license                                                                                           | Low      | `engines` added; rest owner's call (K26)  |
| 32  | Network               | npm and GitHub fetches 12–130 s; `npm ci` ETIMEDOUT once; RustSec DB fetch failed                                                                        | Env      | Retries; offline audit (K24)              |

## What held up

| Check                                                        | Result                                                                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Fresh clone → `npm ci`, `npm run ci`, `npm run program-test` | All pass (after one network retry)                                                                  |
| Secrets in git history                                       | None (no keypair, `.env`, or 64-byte key arrays in any commit)                                      |
| GitHub secret scanning + push protection                     | Enabled                                                                                             |
| IDL vs `declare_id!`                                         | Match: 5 instructions, 4 accounts, 12 errors                                                        |
| Compute units                                                | init 7,112 · add_lot 11,789 · join 8,573 · borrow 22,961 · return_lot 22,041                        |
| Lamport griefing (pre-funded PDAs)                           | Borrow and return still succeed. Anchor's `init` handles it                                         |
| `npm audit --omit=dev`                                       | 0 vulnerabilities                                                                                   |
| `cargo audit --no-fetch` (DB 2026-10-17)                     | 0 vulnerabilities; 6 warnings. Only `bincode` (unmaintained) reaches the program, via `anchor-lang` |
| Devnet readiness                                             | Deploy wallet 21.83 SOL; program needs ~2.56 SOL (2 × 251,624 B rent); `EqkK…` not yet on chain     |
| Solana MCP endpoint                                          | HTTP 200 (12 s)                                                                                     |

## Deep: mutation sweep

`scripts/mutation-check.py` deletes or weakens one rule, rebuilds, and runs the tests. Before Day 4:

```
add_lot: variety check           SURVIVED
add_lot: note length             SURVIVED
return: has_one lot              SURVIVED      ← lineage could be forged and no test would notice
return: note length              SURVIVED
15/19 killed
```

After Day 4 (`npm run program-mutants`):

```
return: has_one lot              KILLED by return_claiming_wrong_parent_lot_rejected
add_lot: variety check           KILLED by add_lot_variety_limit_is_in_bytes
add_lot: note length             KILLED by note_limit_enforced_on_add_and_return
return: note length              KILLED by note_limit_enforced_on_add_and_return
19/19 killed; survivors: []
```

## Deep: probes (temporary module, removed after)

```
member cost: join 1466600 | borrow 1974680 | return 2844680 | total 6285960 lamports
size Library 89 · Member 82 · Lot 280 · Loan 155 bytes
borrow into pre-funded loan PDA: Ok
return into pre-funded lot PDA:  Ok
second return (stale lot_count): Err(InstructionError(0, Custom(2006)))
return claiming a different parent lot: Err(InstructionError(0, Custom(2001)))
variety '青菜青菜青菜青菜青菜青菜' (12 chars, 36 bytes): Err(InstructionError(0, Custom(6001)))
non-member borrow: Err(InstructionError(0, Custom(3012)))
init_library twice: Err(InstructionError(0, Custom(0)))
```

Every probe became a permanent test on Day 4.

## Wide: the toolchain flip (cross-sectional)

```
$ cd /tmp && anchor --version && solana --version
anchor-cli 1.1.2
solana-cli 3.1.10                       ← the shim installed and activated 3.1.10
$ cd expofi && npm run anchor-check && solana --version
✓ anchor-cli 1.1.2 matches anchor-lang 1.1.2
solana-cli 3.1.10                       ← our own Day 1 guard caused the flip at the repo root
$ cd expofi/anchor && anchor --version && solana --version
solana-cli 3.1.14                       ← and anchor/ flips it back
```

Each layer looked fine alone. The defect only shows when you follow one command across the guard, avm, `Anchor.toml` location, and the machine's `active_release` symlink. After the Day 5 fix:

```
== machine flipped to 3.1.10 by anchor outside the repo
$ npm run anchor-check
✓ anchor-cli 1.1.2 and solana-cli 3.1.14 match anchor/Anchor.toml
solana after: 3.1.14
== broken pin (solana_version = "9.9.9")
✖ Toolchain check failed … exit=1
```

## Wide: fresh clone vs this machine

```
$ solana address -k clone/anchor/target/deploy/seed_library-keypair.json
82xuD5RU9MEVzNd3cDLpVsiMrXFe7KtgTKpcpdDDWkyH     ← generated by build-sbf in the clone
$ solana address -k expofi/anchor/target/deploy/seed_library-keypair.json
EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby     ← matches declare_id!
```

Tests pass in both, because LiteSVM loads the program at `declare_id!`. A **deploy** from the clone would land at `82xu…`, where every instruction fails `DeclaredProgramIdMismatch`. The guard now warns about this. The real keypair is backed up to `~/.config/solana/expofi/seed_library-keypair.json` (mode 600).

## CI after Day 5 (run 39746072066)

```
Web:     success 35 s · Program: success 41 s (warm cache)
SOLANA_VERSION: 3.1.14 (read from Anchor.toml)
annotations: 2 (template lint warnings only; Node 20 and Ubuntu 26 warnings gone)
```

## Still not seen

- **A seed-library coordinator.** M10 = 0. TC1 missed on this condition only.
- The program on devnet; a browser wallet signing `borrow`.
- `cargo audit` against a fresh advisory DB (move to CI, K24).

---

# Audit 4: plan days 7–9, from a stale working tree to live devnet

**Date:** 7 November 2026 (calendar Day 19, the day before submission). Same method: every line comes from a command that was run. The audit started from what the docs couldn't say: the docs said 22 Oct, and the tree said otherwise.

## Summary

| #   | Layer               | Finding                                                                                                                                    | Severity | Status                                       |
| --- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------------------------- |
| 33  | Process × Repo      | A full plan day (vault removal, K22, keypair restore) sat uncommitted for 9 days after a session ended mid-build. Docs and CI knew nothing | High     | Verified, landed; commit per day (K37)       |
| 34  | Toolchain × Machine | `anchor` failed on every call. avm 1.2.2 installs its own idea of platform-tools (v1.57, truncated) and repoints the 3.1.14 sysroot at it  | High     | Shim bypassed (K29)                          |
| 35  | Chain               | `EqkK…` was not on devnet                                                                                                                  | High     | Deployed. Hash matches the local build       |
| 36  | Network × Users     | Public devnet RPC 429s and connect timeouts within seconds; the automatic faucet refuses                                                   | High     | Retried; dedicated RPC is owner's call (K30) |
| 37  | UI × Chain          | A member was told "You aren't a member yet" while loading                                                                                  | High     | Fixed; E2E assertion (K33)                   |
| 38  | Client × Program    | A stale read fails `2006`, and the mapped message blamed "someone else" in a borrow that nobody else touched                               | Medium   | Message fixed; borrow re-reads (K31)         |
| 39  | UI × Fonts          | No font had ever loaded, including the template's Inter. Nothing errors                                                                    | Medium   | Fixed; E2E assertion (K34)                   |
| 40  | Docs × Devnet       | Member cost and deploy cost in every doc came from LiteSVM and from arithmetic, and both were wrong for devnet                             | Medium   | Measured and corrected (K38)                 |
| 41  | Product × Reality   | A stranger still can't finish: no URL, and a fresh wallet can't get SOL unaided                                                            | High     | **Open** (K35, K36)                          |
| 42  | Test                | One E2E timeout in 17 runs, cause not proven                                                                                               | Medium   | **Open**, status C (K31)                     |

## What was found first

```
$ git log -1 --format='%h %ad %s' --date=short
b84bcb5 2026-10-22 Kaizen day 6: TC1 checkpoint, audit 3, interview kit, docs
$ git status --short | wc -l          # 32 changed paths, all dated 29 Oct
$ ls app/generated                    # empty: vault deleted, no client generated
$ npx tsc --noEmit
app/page.tsx(11,27): error TS2307: Cannot find module './components/vault-card'    # still the template
$ solana program show EqkK…LzZby --url devnet
Error: Unable to find the account
```

## Toolchain: the shim, again (cross-sectional)

```
$ cd anchor && anchor --version
The latest cargo build-sbf platform-tools (v1.58) is not installed. …
Error: platform-tools v1.57 installation did not create a Rust sysroot at ~/.cache/solana/v1.57/platform-tools
$ tar -tjf ~/.cache/solana/v1.57/platform-tools/tmp-platform-tools-linux-x86_64.tar.bz2
tar: Unexpected EOF in archive
$ avm --version; ls -la --time-style=long-iso ~/.avm/bin/anchor-1.2.2
avm 1.2.2
… 2026-10-29 17:27 …                  # an hour after the session that stopped here
$ avm platform-tools resolve
platform-tools v1.57 (rustc 1.95.0, solana 3.1.14 → map ([toolchain] solana_version in …/Anchor.toml))
$ cargo build-sbf --version
solana-cargo-build-sbf 3.1.14
platform-tools v1.52                  # two tools, one Solana version, two answers
$ readlink …/releases/3.1.14/…/sbf/dependencies/platform-tools
~/.cache/solana/v1.57/platform-tools  # the shim repointed it, and my own diagnostic call did it again
$ ~/.avm/bin/anchor-1.1.2 --version
anchor-cli 1.1.2                      # the real binary was fine all along
```

`cargo build-sbf` puts its own link back to v1.52. After `scripts/anchor.mjs`:

```
$ npm run anchor-check
✓ anchor-cli 1.1.2 and solana-cli 3.1.14 match anchor/Anchor.toml
$ npm run anchor-build                # IDL built; declare_id! and Anchor.toml unchanged
$ readlink …/dependencies/platform-tools
~/.cache/solana/v1.52/platform-tools
$ npm run codama:js && cp -r app/generated gen1 && npm run codama:js && diff -r app/generated gen1
                                      # no output: generation is deterministic (K15)
```

## Chain: the four-way ID check, plus one

```
$ npm run program-deploy
Program Id: EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby     # wallet 19.8167 → 18.5296 SOL
declare_id!("EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby");
seed_library = "EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby"
"EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby" as Address<…>  # generated client
$ solana program dump EqkK…LzZby deployed.so --url devnet && sha256sum target/deploy/seed_library.so deployed.so
d8dc1014629e834d…  target/deploy/seed_library.so
d8dc1014629e834d…  deployed.so
```

## Devnet: rules against the live program (`npm run devnet-smoke`)

```
PASS  join
PASS  borrow
PASS  blocked borrow refused by the program  (6006: "You have an open loan. Return your seed before borrowing again")
PASS  failure reads as a program refusal
PASS  blocked borrow changed nothing
PASS  stale loan_count maps to a plain message  (The library changed while this was on its way. Nothing happened. Try again.)
PASS  return writes the lineage
PASS  the grower is on record
PASS  loan is closed out
PASS  double return refused  (6008: "This loan is not open")
PASS  borrow reopens after the return
measure: member spent 6034720 lamports on join + 2 borrows + return (rent + fees)
PASS  empty wallet gets a funding message
```

That measure didn't match the docs, so it got checked. LiteSVM's rent is not devnet's:

```
$ solana rent 82 --url devnet --lamports      1066800     # LiteSVM: 1461600
$ solana rent 155 --url devnet --lamports     1437640     # LiteSVM: 1969680
$ solana rent 280 --url devnet --lamports     2072640     # LiteSVM: 2839680
1066800 + 2 × 1437640 + 2072640 + 4 × 5000 fees = 6034720  ✓ to the lamport
```

So one join + borrow + return costs a member **4,577,080 lamports of rent (0.00458 SOL)**, not 0.00629. `demo-seed` ran the whole loop with growers holding 0 SOL, so sponsorship (K22) works on real devnet.

## Browser: the real UI, a real signature (`npm run e2e`)

The layer unseen since audit 1. Chromium, the real Next.js app, the live program, and a Wallet Standard wallet injected into the page whose key stays in the test process. **Not Phantom, and not a stranger:** this does not count toward M11.

```
PASS  disconnected: borrow is held back with a reason
PASS  empty wallet: offered free devnet SOL
PASS  empty wallet: join explains funding, not a raw error
PASS  faucet: answers either way  (rate-limited, showed the web faucet)
PASS  wallet rejection: calm message, nothing sent
PASS  join: member card appears
PASS  borrow: return form appears
PASS  borrow: the tin went from 40 to 30
PASS  429 during the blocked borrow: retried, refusal still shown
PASS  blocked borrow: refused in plain words  (Refused by the Solana program / You have an open loan. … / Nothing changed. Program error 6006.)
PASS  blocked borrow: no signature asked
PASS  note: counts bytes, not characters (K21)
PASS  note too long: return is disabled
PASS  no photo: inline error, nothing signed
PASS  return: confirmed
PASS  return: a child lot appears
PASS  lineage: child, then parent, with the grower's note
PASS  try-it checklist complete  (5/5)
measure: demo path took 22 s, 3 signatures      # machine speed, not a stranger's
PASS  fonts: the brand's fonts apply (K34)  (Fraunces / Inter)
PASS  borrow reopens after return
PASS  no console errors on the happy path
PASS  RPC down: failure screen with a retry
PASS  RPC back: recovers without a reload, loan and all
PASS  a member is never told they aren't one while loading
PASS  375 px: no horizontal scroll
```

**"No signature asked" has a mechanism and a limit.** Kit's planner simulates to estimate compute units before signing, so a refused borrow fails before the wallet appears. If a lagging node simulated from an old state, the wallet would be asked, and the program would still refuse on-chain, at the cost of a fee. So the screen says "Nothing changed", not "no fee".

## Deep: mutation sweep

`npm run program-mutants`, re-run today rather than quoting the 29 Oct result:

```
init: name check                 KILLED by tests::tests::init_library_rejects_empty_and_long_names
add_lot: steward has_one         KILLED by tests::tests::add_lot_rejects_non_steward
add_lot: variety check           KILLED by tests::tests::add_lot_variety_limit_is_in_bytes
add_lot: note length             KILLED by tests::tests::note_limit_enforced_on_add_and_return
add_lot: qty > 0                 KILLED by tests::tests::add_lot_rejects_zero_quantity
borrow: gate                     KILLED by tests::tests::borrow_blocked_while_loan_open_and_reopens_after_return
borrow: qty > 0                  KILLED by tests::tests::borrow_rejects_more_than_available_and_zero
borrow: qty <= available         KILLED by tests::tests::borrow_rejects_more_than_available_and_zero, tests::tests::borr
borrow: lot has_one library      KILLED by tests::tests::borrow_rejects_lot_from_another_library
borrow: open_loans not set       KILLED by tests::tests::borrow_then_return_creates_child_lot, tests::tests::borrow_bloc
return: has_one member           KILLED by tests::tests::return_by_non_borrower_rejected
return: has_one lot              KILLED by tests::tests::return_claiming_wrong_parent_lot_rejected
return: status Open              KILLED by tests::tests::double_return_rejected
return: qty > 0                  KILLED by tests::tests::return_without_photo_or_seed_rejected
return: photo check              KILLED by tests::tests::return_without_photo_or_seed_rejected
return: note length              KILLED by tests::tests::return_without_photo_or_seed_rejected
return: generation +1            KILLED by tests::tests::return_without_photo_or_seed_rejected
return: gate not reopened        KILLED by tests::tests::return_without_photo_or_seed_rejected
return: status not flipped       KILLED by tests::tests::double_return_rejected, tests::tests::borrow_then_return_create
join: rent paid by wallet        KILLED by tests::tests::sponsor_pays_all_rent_so_member_pays_nothing
borrow: rent paid by wallet      KILLED by tests::tests::sponsor_pays_all_rent_so_member_pays_nothing
return_lot: rent paid by wallet  KILLED by tests::tests::sponsor_pays_all_rent_so_member_pays_nothing
22/22 killed; survivors: []; skipped: []
```

## What held up

| Check                           | Result                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------- |
| `npm run program-test`          | 24 tests + Anchor's `test_id`, 0 warnings                                    |
| `npm run ci`                    | Build, lint, Prettier pass. Lint warnings 3 → 0                              |
| `cargo fmt --all -- --check`    | Clean: CI widened from one program to all (K17)                              |
| `npm audit --omit=dev`          | 0 vulnerabilities                                                            |
| Keypair                         | `target/deploy` = backup, matches `declare_id!`; `--strict` passed at deploy |
| Light and dark, 1280 and 375 px | Viewed as screenshots; 3 fonts loaded                                        |

## Still not seen

- **A seed-library coordinator.** M10 = 0, on Day 19. The buyer has still never been seen.
- **A stranger.** M11 = 0. There is nowhere to send one yet (K36), and step 1 needs the faucet (K35).
- **A real wallet.** Phantom or Solflare signing in a real browser. The injected wallet proves the code path, not the wallet's own UI.
- `cargo audit` against a fresh advisory DB (K24).
- The cause of the one E2E timeout (K31).
