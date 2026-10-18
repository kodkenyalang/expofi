# Architecture

## Current (as found on 18 Oct 2026)

The repo is the `create-solana-dapp` **`kit/nextjs-anchor`** template, unchanged apart from the dependency fixes in [GENCHI_GENBUTSU.md](GENCHI_GENBUTSU.md).

```
Browser (Next.js 16 / React 19)
  ├─ wallet-standard discovery   app/lib/wallet/{standard,context,signer}.ts
  ├─ cluster switch              app/components/cluster-context.tsx
  ├─ tx pipeline                 app/lib/send-transaction.ts  (build → sign → send → confirm)
  ├─ error mapping               app/lib/errors.ts
  └─ Codama client               app/generated/vault/   (from anchor/target/idl/vault.json)
                │
                ▼  JSON-RPC (devnet)
Solana program  anchor/programs/vault   F4jZpgbtTb6RWNWq6v35fUeiAsRJMrDczVPv9U23yXjB
  ├─ deposit(amount)   SOL → PDA ["vault", signer]
  └─ withdraw()        PDA → signer
Tests           anchor/programs/vault/src/tests.rs   (LiteSVM, 4 tests)
```

Pattern: **Next.js + Anchor dApp** (superstack architecture pattern 1).

## Target: seed-library program (proposal, not built)

A new program `seed_library` in `anchor/programs/seed_library/`, with one instruction per file (`instructions/`), `state.rs`, and `error.rs`. The template `vault` program is removed once this lands (5S: Seiri).

### Accounts

| Account   | PDA seeds                               | Key fields                                                                                               |
| --------- | --------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Library` | `["library", steward]`                  | `steward`, `name`, `lot_count`, `bump`                                                                   |
| `Member`  | `["member", library, wallet]`           | `wallet`, `open_loans: u8`, `loan_count: u32`, `returned: u32`, `bump`                                   |
| `Lot`     | `["lot", library, lot_id (u64 LE)]`     | `variety`, `qty_available`, `parent: Option<Pubkey>`, `generation: u16`, `origin_photo: [u8;32]`, `bump` |
| `Loan`    | `["loan", member, loan_count (u32 LE)]` | `lot`, `qty`, `borrowed_at`, `status: Open \| Returned \| Forgiven`, `child_lot: Option<Pubkey>`, `bump` |

Every seed includes the `library` key, so one library can't read or write another's state (blast-radius rule).

### Instructions

| Instruction          | Signer  | Rule enforced on-chain                                                                                                                                         |
| -------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init_library`       | steward | One library per steward key                                                                                                                                    |
| `join`               | member  | Creates `Member` with `open_loans = 0`                                                                                                                         |
| `add_lot`            | steward | Root lot (`parent = None`, `generation = 0`)                                                                                                                   |
| `borrow`             | member  | **`member.open_loans == 0`** (the borrow gate), `qty <= lot.qty_available`                                                                                     |
| `return_lot`         | member  | Loan is `Open` and owned by signer; creates child `Lot` (`parent = borrowed lot`, `generation + 1`); stores photo hash and germination note; `open_loans -= 1` |
| `attest_germination` | steward | Optional steward sign-off on a returned lot                                                                                                                    |
| `forgive`            | steward | Sets loan `Forgiven`, `open_loans -= 1`. A balancing valve so the library can't deadlock members                                                               |

Duplicate returns are impossible because `return_lot` requires `status == Open` and flips it atomically (idempotency rule).

### Data off-chain

Photos and long notes stay off-chain. Only a 32-byte hash goes on-chain (TRIZ #2, taking out). The UI shows a lot's lineage by walking the `parent` pointers.

### Client

- Regenerate with Codama: add the IDL to `codama.json` and output to `app/generated/seed_library/`.
- Screens: Library, Lot (with lineage), Borrow, Return, My loans. Every failure path has a screen (see AGENT.md, Distributed systems and Omotenashi).

### Tests (required before any devnet deploy)

LiteSVM in `programs/seed_library/src/tests.rs`:

- happy path: borrow → return → child lot has the right parent and generation
- **borrow blocked** while a loan is open
- return by non-borrower rejected
- double return rejected
- forgive unblocks borrowing
- cross-library account substitution rejected

## Decisions log

| Date       | Decision                                                 | Why                                                         |
| ---------- | -------------------------------------------------------- | ----------------------------------------------------------- |
| 2026-10-18 | Build a custom program instead of integrating a protocol | No existing protocol models loans that return offspring     |
| 2026-10-18 | Keep `@solana/kit` 6.x for now                           | Template default; upgrade to Kit 8 as one deliberate change |
| 2026-10-18 | Bump Next.js to 16.4.2                                   | Critical RCE advisory in 16.3.4                             |
| 2026-10-18 | No token, no collateral                                  | Product constraint (see PRODUCT.md)                         |
