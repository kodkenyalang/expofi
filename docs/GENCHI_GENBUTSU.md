# Genchi Genbutsu audit

**Date:** 18 October 2026 (hackathon week 1)
**Method:** go and see each layer for real, then cross-check the layers against each other. Every finding below comes from a command that was actually run. Nothing comes from reading a README.

## Summary

| #   | Layer               | Finding                                                                                                                    | Severity | Status                                          |
| --- | ------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------- |
| 1   | Repo                | Directory was not a git repository; `kodkenyalang/expofi` existed, public and empty                                        | Info     | Fixed: initialised and pushed                   |
| 2   | Dependencies        | `npm install` had been interrupted: lockfile out of sync, `@nodelib/fs.scandir` missing its `package.json`, ESLint crashed | High     | Fixed: `npm install` repaired tree and lock     |
| 3   | Dependencies        | `next@16.3.4` had 7 advisories, including a **critical RCE** (GHSA-vcvr-r3jv-pc5j)                                         | Critical | Fixed: `next` and `eslint-config-next` → 16.4.2 |
| 4   | Toolchain           | Anchor CLI **0.30.1** installed; program uses `anchor-lang 1.1.2`; `npm run setup` fails                                   | High     | **Open**: install Anchor 1.x via avm            |
| 5   | Toolchain × Program | `anchor build` on 0.30.1 **silently rewrote** `declare_id!` and `Anchor.toml` to a new local key                           | High     | Reverted by hand; prevented by AGENT.md rule    |
| 6   | Chain               | Template program `F4jZ…yXjB` is live on devnet, but its upgrade authority is not ours                                      | Info     | Must deploy our own program                     |
| 7   | Program             | 4/4 LiteSVM tests pass; 3 compiler warnings in `tests.rs`                                                                  | Low      | Open (5S: Seiso)                                |
| 8   | Client              | Lint: 0 errors, 3 warnings                                                                                                 | Low      | Open (5S: Seiso)                                |
| 9   | Product × UI        | UI and metadata are still the template ("Solana Starter Kit", "Anchor Vault"). No seed-library code exists yet             | Info     | Open: Week 2                                    |
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
