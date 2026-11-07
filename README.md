# ExpoFi

**A seed library that expects offspring.**

Tool libraries expect the same drill back. A seed library expects _saved seed from the plant you grew_, plus a note on whether it germinated. Allotment societies and seed swaps already run this on paper and Facebook groups. ExpoFi keeps that ledger on Solana. It records who took which lot, what came back, whose return failed, and which lot descends from which. One rule is enforced on-chain: **a member with an open loan cannot borrow again.**

No token. No yield. No collateral. A good return is a record, not a coin.

> Built for the [Encode × Solana Hackathon 2026](https://www.encodeclub.com/programmes/solana-hackathon-2026), _Best Consumer App on Solana_ track.

## How Solana powers it

A borrow is an instruction that **fails on-chain** if the member already has an open loan. A return writes a photo hash and creates a **child lot** whose `parent` is the lot that was borrowed. The seed's lineage is public, append-only, and outlives any one society's spreadsheet.

## Status

[![CI](https://github.com/kodkenyalang/expofi/actions/workflows/ci.yml/badge.svg)](https://github.com/kodkenyalang/expofi/actions/workflows/ci.yml)

As of 7 Nov 2026 (Kaizen plan days 1–9 built, calendar Day 19):

| Area                   | State                                                                                                                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Devnet                 | **Live.** Program `EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby`, demo library `2YrnN8Nhw1iyUkMurjVsq1bHAuA1bs6fwNA73GDHMpAP`                                                             |
| `seed_library` program | **5 of 7 instructions**: `init_library`, `join`, `add_lot`, `borrow` (with the on-chain borrow gate), `return_lot` (lineage). 24 LiteSVM tests; every rule guarded (22/22 mutants killed) |
| UI                     | The seed library: lots, family tree, borrow, blocked borrow, return, and a failure screen for each failure path. Not hosted yet                                                           |
| End-to-end             | The demo path passes through the real UI in Chromium on live devnet, with wallet rejection, RPC failure, and 429s injected. That's a machine with a test wallet. **0 strangers so far**   |
| CI                     | GitHub Actions: web (build, lint, format) + program (rustfmt, build-sbf, LiteSVM)                                                                                                         |
| Not built              | `forgive`, `attest_germination`. **A member whose crop yields no seed stays blocked until `forgive` exists**                                                                              |
| The constraint         | A stranger can't reach or fund the flow: no public URL, and a fresh wallet needs the faucet. Then **0 of 5 buyer interviews** ([kit ready](docs/interviews/README.md)) and the video      |

See [KAIZEN.md](KAIZEN.md) for the measured metrics and [docs/GENCHI_GENBUTSU.md](docs/GENCHI_GENBUTSU.md) for the four first-hand audits behind this table.

## Docs

| Doc                                                | What it answers                                                                    |
| -------------------------------------------------- | ---------------------------------------------------------------------------------- |
| [docs/PRODUCT.md](docs/PRODUCT.md)                 | Who it is for, the job, the demo, what we refuse to build                          |
| [docs/A3.md](docs/A3.md)                           | One-page A3: background, current state, target, countermeasures                    |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)       | The system, the `seed_library` program (accounts, rules, tests), the client        |
| [docs/ROADMAP.md](docs/ROADMAP.md)                 | Four-week plan against the hackathon checkpoints                                   |
| [docs/GENCHI_GENBUTSU.md](docs/GENCHI_GENBUTSU.md) | What we actually found when we went and looked (four audits, 18 Oct to 7 Nov 2026) |
| [docs/interviews/](docs/interviews/README.md)      | Coordinator interview script, note template, privacy rules                         |
| [AGENT.md](AGENT.md)                               | Rules for AI agents and humans: Solana skills and working principles               |
| [brand.md](brand.md)                               | Palette, type, and voice                                                           |
| [KAIZEN.md](KAIZEN.md)                             | 30-day improvement plan, target conditions, kaizen newspaper                       |
| [CHANGELOG.md](CHANGELOG.md)                       | Every push to `main`, date- and time-stamped                                       |
| [anchor/README.md](anchor/README.md)               | Program build, test, and deploy                                                    |

## Prerequisites

| Tool       | Version                                 | Check                                     |
| ---------- | --------------------------------------- | ----------------------------------------- |
| Node.js    | 20.18+ (tested on 22.23)                | `node --version`                          |
| Rust       | stable (tested on 1.95)                 | `rustc --version`                         |
| Solana CLI | 3.x (tested on 3.1.14)                  | `solana --version`                        |
| Anchor CLI | **1.1.2**, to match `anchor-lang 1.1.2` | `npm run anchor-check` (checks both pins) |

Both versions are pinned in `anchor/Anchor.toml` under `[toolchain]`.

### Installing Anchor 1.1.2

Install with [avm](https://www.anchor-lang.com/docs/installation) from the `otter-sec/anchor` repository. This path was verified on 21 Oct 2026:

```bash
cargo install --git https://github.com/otter-sec/anchor --tag v1.1.2 avm --locked --force
avm install 1.1.2            # add --from-source if GLIBC < 2.39 (Ubuntu 22.04, Debian 12)
npm run anchor-check         # must say anchor-cli 1.1.2 and solana-cli 3.1.14 match
```

Gotchas found while doing this (KAIZEN.md K11–K14, K19, K29):

- **GLIBC:** prebuilt Anchor 1.x binaries need GLIBC ≥ 2.39. On Ubuntu 22.04 (2.35) use `--from-source`, which takes about 10 minutes.
- **Don't call `anchor` from `PATH`.** That's avm's shim. Depending on the directory and avm's version, each call can switch the machine's Solana CLI, or install its own platform-tools and repoint the Solana release's sysroot, even for `anchor --version`. This repo's scripts run `~/.avm/bin/anchor-1.1.2` directly through `scripts/anchor.mjs`. If the Solana CLI has been switched, `npm run anchor-check` tells you the fix (`agave-install init 3.1.14`).

> **Never run `anchor build` directly on a mismatched CLI.** Anchor 0.30.x silently rewrites `declare_id!` and `Anchor.toml` to a fresh local key. Use `npm run anchor-build` / `npm run setup`, which run the version guard first.

## Getting started

```bash
npm install
npm run dev            # http://localhost:3000, against the live program on devnet
```

You need a Solana wallet in the browser and a little devnet SOL. The app offers an airdrop, and [faucet.solana.com](https://faucet.solana.com/) is the fallback when that's rate-limited.

| Environment variable         | Does                                                                         |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `NEXT_PUBLIC_EXPOFI_STEWARD` | Show another library (default: the demo library's steward)                   |
| `NEXT_PUBLIC_EXPOFI_RPC_URL` | Use your own RPC instead of the public devnet one, which rate-limits heavily |

To rebuild the program and client (`npm run setup`) you need the Anchor toolchain below.

The program build and tests don't need the Anchor CLI at all:

```bash
npm run program-test   # cargo build-sbf + LiteSVM tests, same as CI
```

## Scripts

| Script                    | Does                                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `npm run dev`             | Next.js dev server                                                                                            |
| `npm run build`           | Production build                                                                                              |
| `npm run ci`              | `build` + `lint` + `format:check`. Run before every push                                                      |
| `npm run program-test`    | `cargo build-sbf` + LiteSVM tests. Run before every push                                                      |
| `npm run anchor-check`    | Fail unless `anchor-lang`, the pinned CLI, and the active Solana CLI match `Anchor.toml`; restore the keypair |
| `npm run program-deploy`  | Deploy to devnet; refuses a keypair that doesn't match `declare_id!`                                          |
| `npm run demo-seed`       | Create the demo library on devnet. Idempotent and resumable                                                   |
| `npm run devnet-smoke`    | The rules against the live program, in a fresh library (~0.02 SOL)                                            |
| `npm run e2e`             | The demo path and chaos cases in Chromium on live devnet, with an injected wallet (~0.03 SOL)                 |
| `npm run program-mutants` | Remove each on-chain rule in turn; fail if any test suite still passes (~5 min)                               |
| `npm run anchor-build`    | Version guard, then `anchor build --ignore-keys` (IDL too)                                                    |
| `npm run setup`           | `anchor-build` + regenerate the TS client                                                                     |
| `npm run anchor-test`     | `anchor-build` + LiteSVM tests                                                                                |
| `npm run codama:js`       | Regenerate `app/generated/*` from the IDL                                                                     |

## Stack

| Layer          | Technology                                                                           |
| -------------- | ------------------------------------------------------------------------------------ |
| Frontend       | Next.js 16.4, React 19.2, TypeScript, Tailwind v4                                    |
| Solana client  | `@solana/kit` 6.x, wallet-standard                                                   |
| Program client | Codama-generated (`app/generated/`)                                                  |
| Program        | Anchor 1.1 (Rust)                                                                    |
| Tests          | LiteSVM (`anchor/programs/*/src/tests.rs`), live devnet scripts, Playwright (`e2e/`) |

## Project layout

```
├── AGENT.md / CLAUDE.md     # Agent rules: Solana skills + working principles
├── KAIZEN.md                # 30-day plan, metrics, kaizen newspaper
├── docs/                    # Product, A3, architecture, roadmap, audits
├── brand.md                 # Palette, type, voice
├── app/                     # Next.js App Router: one page, the demo path
│   ├── components/          # library-view, lot-card, lineage, member-panel, return-form, try-it
│   ├── generated/seed_library/  # Codama client (do not hand-edit)
│   └── lib/                 # Wallet-standard layer, hooks, PDAs, failure mapping
├── anchor/
│   ├── Anchor.toml          # Program IDs + pinned toolchain
│   └── programs/seed_library/   # state, errors, instructions/, tests.rs
├── scripts/
│   ├── anchor.mjs           # Runs the pinned Anchor binary, never avm's shim
│   ├── check-anchor-version.mjs, program-keypair.mjs  # Toolchain and keypair poka-yoke
│   └── devnet/              # demo-seed, smoke (live devnet)
├── e2e/browser-flow.ts      # Demo path + chaos, in Chromium on live devnet
├── .github/workflows/ci.yml # Web + program CI
├── .agents/skills/solana-dev/   # Solana Foundation dev skill (pinned in skills-lock.json)
└── .superstack/build-context.md # Stack decisions + build status
```

## License

Not yet chosen.
