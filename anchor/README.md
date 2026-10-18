# Anchor workspace

This workspace currently contains the template SOL `vault` program from `create-solana-dapp`. The ExpoFi `seed_library` program will be added alongside it, and the vault will be removed once that lands. See [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md).

> **Toolchain:** this workspace needs **Anchor CLI 1.x** (`anchor-lang = "1.1.2"`). On Anchor 0.30.x, `anchor build` silently rewrites `declare_id!` and `Anchor.toml` to a fresh local key, and `npm run setup` fails on `--ignore-keys`. If you can't upgrade yet, build and test without Anchor touching keys:
>
> ```bash
> cargo build-sbf --manifest-path programs/vault/Cargo.toml
> cargo test
> ```

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
