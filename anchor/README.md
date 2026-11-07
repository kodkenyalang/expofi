# Anchor workspace

One program:

| Program        | ID                                             | Status                                                                                  |
| -------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------- |
| `seed_library` | `EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby` | ExpoFi. **Live on devnet.** 5 of 7 instructions, 24 LiteSVM tests, 22/22 mutants killed |

Design, accounts, rules, and the test matrix: [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## Build and test

From the repo root:

```bash
npm run program-test     # cargo build-sbf + cargo test. No Anchor CLI needed
npm run anchor-build     # version guard, then anchor build (IDL too)
npm run program-mutants  # when you change an on-chain rule: every mutant must be killed
```

> **Toolchain:** this workspace needs **Anchor CLI 1.1.x** (`anchor-lang = "1.1.2"`). Don't call `anchor` from `PATH`: that is avm's shim, which can change the machine's Solana CLI and platform-tools when it runs (K19, K29). `scripts/anchor.mjs` runs the pinned binary from `~/.avm/bin/` directly, and every npm script goes through it.

> **Keypair:** `target/deploy/seed_library-keypair.json` is the program's identity and is **gitignored**. It is backed up to `~/.config/solana/expofi/seed_library-keypair.json` (mode 600) on the main dev machine. A fresh or cleaned `cargo build-sbf` generates a _different_ keypair, and the tests still pass. `scripts/program-keypair.mjs` restores the real one from the backup, and moves the wrong one aside, before every build.

## Deploy

```bash
npm run anchor-build     # the .so and IDL
npm run program-deploy   # refuses unless the keypair matches declare_id!
npm run codama:js        # only if the IDL changed
```

The first deploy (7 Nov 2026) cost **1.287 SOL**, and the upgrade authority is the deploy wallet. An upgrade temporarily needs about the same again for its buffer, and returns it.

Then check all four places agree (AGENT.md): `lib.rs`, `Anchor.toml`, `app/generated/seed_library/programs/seedLibrary.ts`, and `solana program show <id> --url devnet`.

## Devnet data

```bash
npm run demo-seed      # the demo library: 3 root lots, plus a bean lot grown for 3 generations
npm run devnet-smoke   # the rules against the live program, in a fresh library
```

`demo-seed` is idempotent and resumable. Its growers are throwaway keypairs with no SOL: the steward pays through the `payer` signer (K22).
