# ExpoFi

**A seed library that expects offspring.**

Tool libraries expect the same drill back. A seed library expects _saved seed from the plant you grew_, plus a note on whether it germinated. Allotment societies and seed swaps already run this on paper and Facebook groups. ExpoFi keeps that ledger on Solana. It records who took which lot, what came back, whose return failed, and which lot descends from which. One rule is enforced on-chain: **a member with an open loan cannot borrow again.**

No token. No yield. No collateral. A good return is a record, not a coin.

> Built for the [Encode × Solana Hackathon 2026](https://www.encodeclub.com/programmes/solana-hackathon-2026), _Best Consumer App on Solana_ track.

## How Solana powers it

A borrow is an instruction that **fails on-chain** if the member already has an open loan. A return writes a photo hash and creates a **child lot** whose `parent` is the lot that was borrowed. The seed's lineage is public, append-only, and outlives any one society's spreadsheet.

## Status

[![CI](https://github.com/kodkenyalang/expofi/actions/workflows/ci.yml/badge.svg)](https://github.com/kodkenyalang/expofi/actions/workflows/ci.yml)

As of 21 Oct 2026 (Kaizen plan days 1–3 done):

| Area                                           | State                                                                                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Scaffold (Next.js 16 + `@solana/kit` + Anchor) | Done, builds clean                                                                                                                             |
| Toolchain                                      | Anchor 1.1.2 + Solana 3.1.14, pinned in `anchor/Anchor.toml`; version guard before every Anchor build                                          |
| `seed_library` program                         | **5 of 7 instructions**: `init_library`, `join`, `add_lot`, `borrow` (with the on-chain borrow gate), `return_lot` (lineage). 13 LiteSVM tests |
| CI                                             | GitHub Actions: web (build, lint, format) + program (rustfmt, build-sbf, LiteSVM). Green                                                       |
| UI                                             | Template UI ("Anchor Vault"), to be replaced (Cycle 2)                                                                                         |
| Devnet deploy                                  | Not yet. `seed_library` ID reserved: `EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby`                                                            |
| Buyer interviews                               | **0 of 5. This is now the constraint** (see KAIZEN.md)                                                                                         |

See [KAIZEN.md](KAIZEN.md) for the measured metrics and [docs/GENCHI_GENBUTSU.md](docs/GENCHI_GENBUTSU.md) for the first-hand audits behind this table.

## Docs

| Doc                                                | What it answers                                                          |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| [docs/PRODUCT.md](docs/PRODUCT.md)                 | Who it is for, the job, the demo, what we refuse to build                |
| [docs/A3.md](docs/A3.md)                           | One-page A3: background, current state, target, countermeasures          |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)       | The `seed_library` program (accounts, rules, tests) and the template app |
| [docs/ROADMAP.md](docs/ROADMAP.md)                 | Four-week plan against the hackathon checkpoints                         |
| [docs/GENCHI_GENBUTSU.md](docs/GENCHI_GENBUTSU.md) | What we actually found when we went and looked (18 and 21 Oct 2026)      |
| [AGENT.md](AGENT.md)                               | Rules for AI agents and humans: Solana skills and working principles     |
| [KAIZEN.md](KAIZEN.md)                             | 30-day improvement plan, target conditions, kaizen newspaper             |
| [CHANGELOG.md](CHANGELOG.md)                       | Every push to `main`, date- and time-stamped                             |
| [anchor/README.md](anchor/README.md)               | Program build, test, and deploy                                          |

## Prerequisites

| Tool       | Version                                 | Check                  |
| ---------- | --------------------------------------- | ---------------------- |
| Node.js    | 20.18+ (tested on 22.23)                | `node --version`       |
| Rust       | stable (tested on 1.95)                 | `rustc --version`      |
| Solana CLI | 3.x (tested on 3.1.14)                  | `solana --version`     |
| Anchor CLI | **1.1.2**, to match `anchor-lang 1.1.2` | `npm run anchor-check` |

Both versions are pinned in `anchor/Anchor.toml` under `[toolchain]`.

### Installing Anchor 1.1.2

Install with [avm](https://www.anchor-lang.com/docs/installation) from the `otter-sec/anchor` repository. This path was verified on 21 Oct 2026:

```bash
cargo install --git https://github.com/otter-sec/anchor --tag v1.1.2 avm --locked --force
avm install 1.1.2            # add --from-source if GLIBC < 2.39 (Ubuntu 22.04, Debian 12)
avm use 1.1.2
anchor --version             # must print anchor-cli 1.1.2
```

Gotchas found while doing this (KAIZEN.md K11–K14):

- **GLIBC:** prebuilt Anchor 1.x binaries need GLIBC ≥ 2.39. On Ubuntu 22.04 (2.35) use `--from-source`, which takes about 10 minutes.
- **Shadowed binary:** if `anchor --version` still prints an old version, an older `cargo install anchor-cli` in `~/.cargo/bin` is shadowing avm's shim in `~/.avm/bin`. Run `cargo uninstall anchor-cli`, then either add `~/.avm/bin` to `PATH` or `ln -s ~/.avm/bin/avm ~/.cargo/bin/anchor`.
- **Solana CLI switching:** the avm 1.x shim switches your Solana CLI to whatever the project's `[toolchain] solana_version` says (or Anchor's recommended version if unset). This repo pins 3.1.14.

> **Never run `anchor build` directly on a mismatched CLI.** Anchor 0.30.x silently rewrites `declare_id!` and `Anchor.toml` to a fresh local key. Use `npm run anchor-build` / `npm run setup`, which run the version guard first.

## Getting started

```bash
npm install
npm run setup          # version guard + anchor build --ignore-keys + Codama client
npm run dev            # http://localhost:3000
```

The program build and tests don't need the Anchor CLI at all:

```bash
npm run program-test   # cargo build-sbf + LiteSVM tests, same as CI
```

## Scripts

| Script                 | Does                                                       |
| ---------------------- | ---------------------------------------------------------- |
| `npm run dev`          | Next.js dev server                                         |
| `npm run build`        | Production build                                           |
| `npm run ci`           | `build` + `lint` + `format:check`. Run before every push   |
| `npm run program-test` | `cargo build-sbf` + LiteSVM tests. Run before every push   |
| `npm run anchor-check` | Fail if `anchor --version` doesn't match `anchor-lang`     |
| `npm run anchor-build` | Version guard, then `anchor build --ignore-keys` (IDL too) |
| `npm run setup`        | `anchor-build` + regenerate the TS client                  |
| `npm run anchor-test`  | `anchor-build` + LiteSVM tests                             |
| `npm run codama:js`    | Regenerate `app/generated/*` from the IDL                  |

## Stack

| Layer          | Technology                                        |
| -------------- | ------------------------------------------------- |
| Frontend       | Next.js 16.4, React 19.2, TypeScript, Tailwind v4 |
| Solana client  | `@solana/kit` 6.x, wallet-standard                |
| Program client | Codama-generated (`app/generated/`)               |
| Program        | Anchor 1.1 (Rust)                                 |
| Tests          | LiteSVM (`anchor/programs/*/src/tests.rs`)        |

## Project layout

```
├── AGENT.md / CLAUDE.md     # Agent rules: Solana skills + working principles
├── KAIZEN.md                # 30-day plan, metrics, kaizen newspaper
├── docs/                    # Product, A3, architecture, roadmap, audits
├── app/                     # Next.js App Router
│   ├── components/          # UI (template vault-card to be replaced)
│   ├── generated/vault/     # Codama client (do not hand-edit)
│   └── lib/                 # Wallet-standard layer, tx pipeline, errors
├── anchor/
│   ├── Anchor.toml          # Program IDs + pinned toolchain
│   └── programs/
│       ├── seed_library/    # ExpoFi program: state, errors, instructions/, tests.rs
│       └── vault/           # Template program (removed in Cycle 2)
├── scripts/check-anchor-version.mjs  # Toolchain poka-yoke
├── .github/workflows/ci.yml # Web + program CI
├── .agents/skills/solana-dev/   # Solana Foundation dev skill (pinned in skills-lock.json)
└── .superstack/build-context.md # Stack decisions + build status
```

## License

Not yet chosen.
