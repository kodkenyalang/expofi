# ExpoFi

**A seed library that expects offspring.**

Tool libraries expect the same drill back. A seed library expects _saved seed from the plant you grew_, plus a note on whether it germinated. Allotment societies and seed swaps already run this on paper and Facebook groups. ExpoFi keeps that ledger on Solana. It records who took which lot, what came back, whose return failed, and which lot descends from which. One rule is enforced on-chain: **a member with an open or failed loan cannot borrow again.**

No token. No yield. No collateral. A good return is a record, not a coin.

> Built for the [Encode × Solana Hackathon 2026](https://www.encodeclub.com/programmes/solana-hackathon-2026), _Best Consumer App on Solana_ track.

## How Solana powers it

A borrow is an instruction that **fails on-chain** if the member already has an open loan. A return writes a photo hash and creates a **child lot** whose `parent` is the lot that was borrowed. The seed's lineage is public, append-only, and outlives any one society's spreadsheet.

## Status

| Area                                           | State                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| Scaffold (Next.js 16 + `@solana/kit` + Anchor) | Done, builds clean                                                     |
| Seed-library program                           | **Not started.** The repo still ships the template SOL `vault` program |
| UI                                             | Template UI ("Anchor Vault"), to be replaced                           |
| Devnet deploy                                  | Template vault only (`F4jZ…yXjB`, not our upgrade authority)           |

See [docs/GENCHI_GENBUTSU.md](docs/GENCHI_GENBUTSU.md) for the first-hand audit behind this table.

## Docs

| Doc                                                | What it answers                                                      |
| -------------------------------------------------- | -------------------------------------------------------------------- |
| [docs/PRODUCT.md](docs/PRODUCT.md)                 | Who it is for, the job, the demo, what we refuse to build            |
| [docs/A3.md](docs/A3.md)                           | One-page A3: background, current state, target, countermeasures      |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)       | Current template architecture and the target seed-library program    |
| [docs/ROADMAP.md](docs/ROADMAP.md)                 | Four-week plan against the hackathon checkpoints                     |
| [docs/GENCHI_GENBUTSU.md](docs/GENCHI_GENBUTSU.md) | What we actually found when we went and looked (18 Oct 2026)         |
| [AGENT.md](AGENT.md)                               | Rules for AI agents and humans: Solana skills and working principles |
| [KAIZEN.md](KAIZEN.md)                             | 30-day improvement plan, target conditions, kaizen newspaper         |
| [anchor/README.md](anchor/README.md)               | Program build, test, and deploy                                      |

## Prerequisites

| Tool       | Version                               | Check              |
| ---------- | ------------------------------------- | ------------------ |
| Node.js    | 20.18+ (tested on 22.23)              | `node --version`   |
| Rust       | stable (tested on 1.95)               | `rustc --version`  |
| Solana CLI | 3.x (tested on 3.1.14)                | `solana --version` |
| Anchor CLI | **1.x**, to match `anchor-lang 1.1.2` | `anchor --version` |

> **Anchor 0.30.x will not work.** `npm run setup` fails with `unexpected argument '--ignore-keys'`. A plain `anchor build` on 0.30.x also silently rewrites `declare_id!` and `Anchor.toml` to a fresh local key. Install Anchor 1.x with [avm](https://www.anchor-lang.com/docs/installation):
>
> ```bash
> cargo install --git https://github.com/solana-foundation/anchor avm --force
> avm install 1.1.2 && avm use 1.1.2
> ```

## Getting started

```bash
npm install
npm run setup   # anchor build --ignore-keys + Codama client generation (needs Anchor 1.x)
npm run dev     # http://localhost:3000
```

If you are stuck on Anchor 0.30.x, you can still build and test the program without touching the program ID:

```bash
cd anchor
cargo build-sbf --manifest-path programs/vault/Cargo.toml
cargo test
```

## Scripts

| Script                | Does                                                     |
| --------------------- | -------------------------------------------------------- |
| `npm run dev`         | Next.js dev server                                       |
| `npm run build`       | Production build                                         |
| `npm run ci`          | `build` + `lint` + `format:check`. Run before every push |
| `npm run setup`       | Build the Anchor program and regenerate the TS client    |
| `npm run anchor-test` | Build the program and run LiteSVM tests (`cargo test`)   |
| `npm run codama:js`   | Regenerate `app/generated/*` from the IDL                |

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
├── docs/                    # Product, A3, architecture, roadmap, audit
├── app/                     # Next.js App Router
│   ├── components/          # UI (template vault-card to be replaced)
│   ├── generated/vault/     # Codama client (do not hand-edit)
│   └── lib/                 # Wallet-standard layer, tx pipeline, errors
├── anchor/
│   └── programs/vault/      # Template program; seed-library program goes alongside
├── .agents/skills/solana-dev/   # Solana Foundation dev skill (pinned in skills-lock.json)
└── .superstack/build-context.md # Stack decisions + build status
```

## License

Not yet chosen.
