# Anchor workspace

Two programs:

| Program        | ID                                             | Status                                                                                |
| -------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `seed_library` | `EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby` | ExpoFi. 5 of 7 instructions, 22 LiteSVM tests, 19/19 mutants killed. Not deployed yet |
| `vault`        | `F4jZpgbtTb6RWNWq6v35fUeiAsRJMrDczVPv9U23yXjB` | Template from `create-solana-dapp`. Removed once the new UI lands (Cycle 2)           |

Design, accounts, rules, and the test matrix: [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

## Build and test

From the repo root:

```bash
npm run program-test   # cargo build-sbf + cargo test for all programs. No Anchor CLI needed
npm run anchor-build   # anchor build (IDL too). Runs the version guard first
```

Or by hand:

```bash
cd anchor
cargo build-sbf        # builds every program into target/deploy/*.so
cargo test             # LiteSVM tests load those .so files
```

> **Toolchain:** this workspace needs **Anchor CLI 1.1.x** (`anchor-lang = "1.1.2"`). On Anchor 0.30.x, `anchor build` silently rewrites `declare_id!` and `Anchor.toml` to a fresh local key. `npm run anchor-check` (run automatically by `anchor-build` and `setup`) stops that from happening.

> **Keypair:** `target/deploy/seed_library-keypair.json` is the `seed_library` program's identity and is **gitignored**. On the main dev machine it is backed up to `~/.config/solana/expofi/seed_library-keypair.json` (mode 600). A fresh clone's `cargo build-sbf` generates a _different_ keypair and the tests still pass, so only `npm run anchor-check` notices (it warns). Never deploy from a machine where it warns; copy the real keypair in over a secure channel first.

## Template vault program

A simple SOL vault program built with [Anchor](https://www.anchor-lang.com/).

## Pre-deployed Program

The vault program is deployed on **devnet** at:

```
F4jZpgbtTb6RWNWq6v35fUeiAsRJMrDczVPv9U23yXjB
```

You can interact with it immediately by connecting your wallet to devnet.

## Deploying Your Own Program

To deploy your own version of the program:

### 1. Generate a new program keypair

```bash
cd anchor
solana-keygen new -o target/deploy/vault-keypair.json
```

### 2. Get the new program ID

```bash
solana address -k target/deploy/vault-keypair.json
```

### 3. Update the program ID

Update the program ID in these files:

- `anchor/Anchor.toml` - Update `vault = "..."` under `[programs.devnet]`
- `anchor/programs/vault/src/lib.rs` - Update `declare_id!("...")`

### 4. Build and deploy

```bash
# Build the program
anchor build

# Get devnet SOL for deployment (~2 SOL needed)
solana airdrop 2 --url devnet

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### 5. Regenerate the TypeScript client

```bash
cd ..
npm run codama:js
```

This updates the generated client code in `app/generated/vault/` with your new program ID.

## Program Overview

The vault program allows users to:

- **Deposit**: Send SOL to a personal vault PDA (Program Derived Address)
- **Withdraw**: Retrieve all SOL from your vault

Each user gets their own vault derived from their wallet address.

## Testing

Run the Anchor tests:

```bash
anchor test --skip-deploy
```
