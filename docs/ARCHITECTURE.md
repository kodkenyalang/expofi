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
└── tests.rs            # LiteSVM, 22 tests (19/19 mutants killed)
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

| Instruction          | Signer  | Status     | Rule enforced on-chain (error)                                                                                                                                                                                                                                   |
| -------------------- | ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `init_library`       | steward | ✅ Day 2   | One library per steward key (PDA). Name 1–32 **bytes** (`InvalidName`). A second `init_library` fails (`Custom(0)`, account in use)                                                                                                                              |
| `join`               | member  | ✅ Day 2   | One membership per wallet per library (PDA `init` fails on repeat). **Open join**: no steward approval yet                                                                                                                                                       |
| `add_lot`            | steward | ✅ Day 2   | Only the steward (`NotSteward`). Variety 1–32 bytes, qty > 0, note ≤ 80 bytes. Root lot: `parent = None`, `generation = 0`                                                                                                                                       |
| `borrow`             | member  | ✅ Day 3   | **Borrow gate: `open_loans == 0` (`BorrowBlocked`)**. Lot must belong to this library (`WrongLibrary`). `0 < qty ≤ qty_available` (`InvalidQuantity`, `InsufficientSeed`)                                                                                        |
| `return_lot`         | member  | ✅ Day 3   | Loan must be the signer's (`NotBorrower`) and `Open` (`LoanNotOpen`). Parent must be the lot actually borrowed (`WrongLot`). qty > 0, photo hash non-zero (`MissingPhoto`). Creates child `Lot` with `parent = borrowed lot`, `generation + 1`; reopens the gate |
| `attest_germination` | steward | ⏳ Cycle 2 | Optional steward sign-off on a returned lot                                                                                                                                                                                                                      |
| `forgive`            | steward | ⏳ Cycle 2 | Sets loan `Forgiven`, reopens the gate. The balancing valve for crop failure, so the library can't deadlock members                                                                                                                                              |

Duplicate returns are impossible: `return_lot` requires `status == Open` and flips it in the same instruction (idempotency rule). Tested.

**Crop failure is not a return.** `return_lot` requires at least one seed and a photo. A member whose crop failed asks the steward to `forgive` the loan (Cycle 2). This keeps "returned" meaning "offspring exist", which the lineage depends on, without punishing failure (PRODUCT.md).

### Errors

Codes are **append-only**: clients match on numbers, so a new error goes at the end and existing codes never move. `WrongLot` (6012) was appended on 22 Oct for that reason.

| Code | Error             | Code | Error              |
| ---- | ----------------- | ---- | ------------------ |
| 6000 | `InvalidName`     | 6007 | `InsufficientSeed` |
| 6001 | `InvalidVariety`  | 6008 | `LoanNotOpen`      |
| 6002 | `NoteTooLong`     | 6009 | `NotBorrower`      |
| 6003 | `InvalidQuantity` | 6010 | `MissingPhoto`     |
| 6004 | `NotSteward`      | 6011 | `Overflow`         |
| 6005 | `WrongLibrary`    | 6012 | `WrongLot`         |
| 6006 | `BorrowBlocked`   |      |                    |

Framework codes the UI must also map: `3012 AccountNotInitialized` (wallet hasn't joined: "join first"), `2006 ConstraintSeeds` on `add_lot`/`return_lot` (stale `lot_count`: re-read and retry), `Custom(0)` from the system program (account already exists).

**Text limits are bytes**, because account space is bytes. 32 bytes is 32 Latin letters but only 10 CJK characters. The UI must count bytes (`new TextEncoder().encode(s).length`), not characters.

### Costs and limits (measured 22 Oct, LiteSVM)

| Instruction    | Compute units | Account created | Rent paid by | Rent (lamports) |
| -------------- | ------------- | --------------- | ------------ | --------------- |
| `init_library` | 7,112         | Library, 89 B   | steward      | 1,510,320       |
| `add_lot`      | 11,789        | Lot, 280 B      | steward      | 2,839,680       |
| `join`         | 8,573         | Member, 82 B    | member       | 1,461,600       |
| `borrow`       | 22,961        | Loan, 155 B     | member       | 1,969,680       |
| `return_lot`   | 22,041        | Lot, 280 B      | member       | 2,839,680       |

- A test enforces a **40,000 CU budget** per instruction (max today 22,961).
- **A member pays 0.00629 SOL** (join + borrow + return, plus ~5,000 lamports per transaction in fees). Nothing is ever closed, so the rent stays locked. Every `init` uses the member's own wallet as payer, so a society **can't sponsor** its members. Decide before the first deploy (K22): a separate `payer` signer, and closing `Loan` after return (lineage lives in `Lot.parent`, so a returned loan isn't needed for it).
- Deploying the program needs about **2.56 SOL** (2 × 251,624 B rent for program data and buffer).

### Concurrency

Lot ids are a per-library sequence (`Library.lot_count`), so every `add_lot` and `return_lot` in a library writes the Library account and runs one at a time. If two clients build transactions from the same `lot_count`, the second fails with `2006 ConstraintSeeds`. The client must re-read the library and rebuild (`stale_lot_count_rejected_then_retry_succeeds`). At seed-library scale (a few returns a day) this is fine. A federation of busy libraries would need per-member lot ids instead.

### Keypair

`declare_id!` is `EqkK…LzZby`. The matching keypair is in `anchor/target/deploy/` (gitignored) and backed up to `~/.config/solana/expofi/seed_library-keypair.json` on the developer machine. A fresh clone's `cargo build-sbf` **generates a different keypair**, and tests still pass, so only `npm run anchor-check` notices (it warns). Never deploy from a machine where it warns.

### Data off-chain

Photos and long notes stay off-chain. Only a 32-byte hash and a short note (≤80 chars, e.g. "18/20 germinated") go on-chain (TRIZ #2, taking out). The UI shows a lot's lineage by walking the `parent` pointers.

### Client

- Regenerate with Codama: add the IDL to `codama.json` and output to `app/generated/seed_library/` (Cycle 2, needs Anchor 1.x for the IDL).
- Screens: Library, Lot (with lineage), Borrow, Return, My loans. Every failure path has a screen (see AGENT.md, Distributed systems and Omotenashi).

### Tests

LiteSVM in `programs/seed_library/src/tests.rs`. Instructions are built with Anchor's generated `crate::instruction::*` and `crate::accounts::*` types (no hand-written discriminators: poka-yoke), and every failure test asserts the **exact** custom error code.

| Rule                                                | Test                                                      | Status |
| --------------------------------------------------- | --------------------------------------------------------- | ------ |
| Library, member, root lot created correctly         | `init_library_join_and_add_root_lot`                      | ✅     |
| Name validation                                     | `init_library_rejects_empty_and_long_names`               | ✅     |
| Only steward adds lots                              | `add_lot_rejects_non_steward`                             | ✅     |
| Lot needs seed                                      | `add_lot_rejects_zero_quantity`                           | ✅     |
| One membership per wallet                           | `join_twice_fails`                                        | ✅     |
| Happy path: borrow → return → child lot             | `borrow_then_return_creates_child_lot`                    | ✅     |
| **Borrow gate** blocks, then reopens after return   | `borrow_blocked_while_loan_open_and_reopens_after_return` | ✅     |
| Quantity bounds on borrow                           | `borrow_rejects_more_than_available_and_zero`             | ✅     |
| Cross-library account substitution rejected         | `borrow_rejects_lot_from_another_library`                 | ✅     |
| Return by non-borrower rejected                     | `return_by_non_borrower_rejected`                         | ✅     |
| Double return rejected                              | `double_return_rejected`                                  | ✅     |
| Return needs photo and seed                         | `return_without_photo_or_seed_rejected`                   | ✅     |
| Lineage across 2 generations and 2 growers          | `lineage_spans_generations`                               | ✅     |
| Forged parent lot rejected (`WrongLot`)             | `return_claiming_wrong_parent_lot_rejected`               | ✅     |
| Variety limit in bytes (incl. CJK boundary)         | `add_lot_variety_limit_is_in_bytes`                       | ✅     |
| Note limit on add and return                        | `note_limit_enforced_on_add_and_return`                   | ✅     |
| One library per steward                             | `init_library_twice_fails`                                | ✅     |
| Non-member can't borrow (`3012`)                    | `non_member_cannot_borrow`                                | ✅     |
| Stale `lot_count` fails `2006`, retry succeeds      | `stale_lot_count_rejected_then_retry_succeeds`            | ✅     |
| Pre-funded PDAs don't block init (lamport griefing) | `pre_funded_pdas_do_not_block_borrow_or_return`           | ✅     |
| Borrowing the whole lot empties it                  | `borrowing_the_whole_lot_empties_it`                      | ✅     |
| Every instruction under 40k CU                      | `every_instruction_within_compute_budget`                 | ✅     |
| Forgive unblocks borrowing                          | (with `forgive`)                                          | ⏳     |

**Mutation check:** `npm run program-mutants` removes each of 19 rules in turn and requires a test to fail. 22 Oct: 15/19 before Day 4 (lineage, variety and note rules unguarded), **19/19 after**. It exits 1 on any survivor. Run it whenever a rule changes.

## Decisions log

| Date       | Decision                                                     | Why                                                                       |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 2026-10-18 | Build a custom program instead of integrating a protocol     | No existing protocol models loans that return offspring                   |
| 2026-10-18 | Keep `@solana/kit` 6.x for now                               | Template default; upgrade to Kit 8 as one deliberate change               |
| 2026-10-18 | Bump Next.js to 16.4.2                                       | Critical RCE advisory in 16.3.4                                           |
| 2026-10-18 | No token, no collateral                                      | Product constraint (see PRODUCT.md)                                       |
| 2026-10-21 | `return_lot` requires qty > 0 and a photo hash               | "Returned" must mean offspring exist; crop failure goes through `forgive` |
| 2026-10-21 | `join` is open (no steward approval) for now                 | Unblocks the demo; revisit after coordinator interviews (K7)              |
| 2026-10-21 | CI builds with `cargo build-sbf`, not `anchor build`         | No Anchor CLI in CI, and no way for CI to rewrite keys (K3)               |
| 2026-10-22 | Error codes are append-only; `WrongLot` added as 6012        | Clients match on numbers; moving codes breaks them silently               |
| 2026-10-22 | Text limits stay in bytes; messages and UI say so            | Account space is bytes; counting characters on-chain costs CU for nothing |
| 2026-10-22 | Payer split and loan closing decided **before** deploy (K22) | Account layouts are cheap to change before deploy, expensive after        |
