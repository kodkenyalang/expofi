# Architecture

## Template app (as found on 18 Oct 2026, still in place)

The web app is still the `create-solana-dapp` **`kit/nextjs-anchor`** template, unchanged apart from the dependency fixes in [GENCHI_GENBUTSU.md](GENCHI_GENBUTSU.md). It is replaced in Cycle 2 (KAIZEN.md).

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

## `seed_library` program (in progress: 5 of 7 instructions built)

`anchor/programs/seed_library/`. Program ID **`EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby`** (not yet deployed). Layout follows AGENT.md (UNIX philosophy, 5S Seiton):

```
programs/seed_library/src/
├── lib.rs              # declare_id!, #[program] entrypoints (thin: delegate to instructions/)
├── state.rs            # Library, Member, Lot, Loan, LoanStatus
├── error.rs            # SeedLibraryError (plain-language messages for the UI)
├── instructions/       # one instruction per file, logic in impl blocks on the Accounts struct
│   ├── init_library.rs
│   ├── join.rs
│   ├── add_lot.rs
│   ├── borrow.rs
│   └── return_lot.rs
└── tests.rs            # LiteSVM, 13 tests
```

The program keypair lives in `anchor/target/deploy/seed_library-keypair.json`. That folder is gitignored, so **back the keypair up**: losing it means losing the program ID before the first deploy, and upgrade control after it.

### Accounts

| Account   | PDA seeds                               | Fields                                                                                                                                                                        |
| --------- | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Library` | `["library", steward]`                  | `steward`, `name` (≤32), `lot_count: u64`, `member_count: u32`, `bump`                                                                                                        |
| `Member`  | `["member", library, wallet]`           | `library`, `wallet`, `open_loans: u8`, `loan_count: u32`, `returned: u32`, `bump`                                                                                             |
| `Lot`     | `["lot", library, lot_id (u64 LE)]`     | `library`, `id`, `variety` (≤32), `qty_available: u32`, `parent: Option<Pubkey>`, `generation: u16`, `contributor`, `photo_hash: [u8;32]`, `note` (≤80), `created_at`, `bump` |
| `Loan`    | `["loan", member, loan_index (u32 LE)]` | `library`, `member`, `lot`, `index`, `qty`, `borrowed_at`, `status: Open \| Returned \| Forgiven`, `child_lot: Option<Pubkey>`, `bump`                                        |

Every seed includes the `library` key, directly or through the `member` PDA, so one library can't read or write another's state (blast-radius rule). Root lots and returned lots share one `lot_count` sequence per library.

### Instructions

| Instruction          | Signer  | Status     | Rule enforced on-chain (error)                                                                                                                                                                            |
| -------------------- | ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init_library`       | steward | ✅ Day 2   | One library per steward key (PDA). Name 1–32 chars (`InvalidName`)                                                                                                                                        |
| `join`               | member  | ✅ Day 2   | One membership per wallet per library (PDA `init` fails on repeat). **Open join**: no steward approval yet                                                                                                |
| `add_lot`            | steward | ✅ Day 2   | Only the steward (`NotSteward`). Variety 1–32 chars, qty > 0, note ≤ 80. Root lot: `parent = None`, `generation = 0`                                                                                      |
| `borrow`             | member  | ✅ Day 3   | **Borrow gate: `open_loans == 0` (`BorrowBlocked`)**. Lot must belong to this library (`WrongLibrary`). `0 < qty ≤ qty_available` (`InvalidQuantity`, `InsufficientSeed`)                                 |
| `return_lot`         | member  | ✅ Day 3   | Loan must be the signer's (`NotBorrower`) and `Open` (`LoanNotOpen`). qty > 0, photo hash non-zero (`MissingPhoto`). Creates child `Lot` with `parent = borrowed lot`, `generation + 1`; reopens the gate |
| `attest_germination` | steward | ⏳ Cycle 2 | Optional steward sign-off on a returned lot                                                                                                                                                               |
| `forgive`            | steward | ⏳ Cycle 2 | Sets loan `Forgiven`, reopens the gate. The balancing valve for crop failure, so the library can't deadlock members                                                                                       |

Duplicate returns are impossible: `return_lot` requires `status == Open` and flips it in the same instruction (idempotency rule). Tested.

**Crop failure is not a return.** `return_lot` requires at least one seed and a photo. A member whose crop failed asks the steward to `forgive` the loan (Cycle 2). This keeps "returned" meaning "offspring exist", which the lineage depends on, without punishing failure (PRODUCT.md).

### Data off-chain

Photos and long notes stay off-chain. Only a 32-byte hash and a short note (≤80 chars, e.g. "18/20 germinated") go on-chain (TRIZ #2, taking out). The UI shows a lot's lineage by walking the `parent` pointers.

### Client

- Regenerate with Codama: add the IDL to `codama.json` and output to `app/generated/seed_library/` (Cycle 2, needs Anchor 1.x for the IDL).
- Screens: Library, Lot (with lineage), Borrow, Return, My loans. Every failure path has a screen (see AGENT.md, Distributed systems and Omotenashi).

### Tests

LiteSVM in `programs/seed_library/src/tests.rs`. Instructions are built with Anchor's generated `crate::instruction::*` and `crate::accounts::*` types (no hand-written discriminators: poka-yoke), and every failure test asserts the **exact** custom error code.

| Rule                                              | Test                                                      | Status |
| ------------------------------------------------- | --------------------------------------------------------- | ------ |
| Library, member, root lot created correctly       | `init_library_join_and_add_root_lot`                      | ✅     |
| Name validation                                   | `init_library_rejects_empty_and_long_names`               | ✅     |
| Only steward adds lots                            | `add_lot_rejects_non_steward`                             | ✅     |
| Lot needs seed                                    | `add_lot_rejects_zero_quantity`                           | ✅     |
| One membership per wallet                         | `join_twice_fails`                                        | ✅     |
| Happy path: borrow → return → child lot           | `borrow_then_return_creates_child_lot`                    | ✅     |
| **Borrow gate** blocks, then reopens after return | `borrow_blocked_while_loan_open_and_reopens_after_return` | ✅     |
| Quantity bounds on borrow                         | `borrow_rejects_more_than_available_and_zero`             | ✅     |
| Cross-library account substitution rejected       | `borrow_rejects_lot_from_another_library`                 | ✅     |
| Return by non-borrower rejected                   | `return_by_non_borrower_rejected`                         | ✅     |
| Double return rejected                            | `double_return_rejected`                                  | ✅     |
| Return needs photo and seed                       | `return_without_photo_or_seed_rejected`                   | ✅     |
| Lineage across 2 generations and 2 growers        | `lineage_spans_generations`                               | ✅     |
| Forgive unblocks borrowing                        | (with `forgive`)                                          | ⏳     |

Mutation check (21 Oct): deleting the borrow-gate `require!` makes `borrow_blocked_while_loan_open_and_reopens_after_return` fail, so the test really guards the rule.

## Decisions log

| Date       | Decision                                                 | Why                                                                       |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------------------------- |
| 2026-10-18 | Build a custom program instead of integrating a protocol | No existing protocol models loans that return offspring                   |
| 2026-10-18 | Keep `@solana/kit` 6.x for now                           | Template default; upgrade to Kit 8 as one deliberate change               |
| 2026-10-18 | Bump Next.js to 16.4.2                                   | Critical RCE advisory in 16.3.4                                           |
| 2026-10-18 | No token, no collateral                                  | Product constraint (see PRODUCT.md)                                       |
| 2026-10-21 | `return_lot` requires qty > 0 and a photo hash           | "Returned" must mean offspring exist; crop failure goes through `forgive` |
| 2026-10-21 | `join` is open (no steward approval) for now             | Unblocks the demo; revisit after coordinator interviews (K7)              |
| 2026-10-21 | CI builds with `cargo build-sbf`, not `anchor build`     | No Anchor CLI in CI, and no way for CI to rewrite keys (K3)               |
