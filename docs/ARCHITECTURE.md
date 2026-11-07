# Architecture

## System

The `create-solana-dapp` template's wallet layer stayed. Its vault program, UI, and client are gone. Pattern: **Next.js + Anchor dApp** (superstack architecture pattern 1).

```
Browser (Next.js 16 / React 19), static page, no server, no secrets
  ├─ wallet-standard discovery   app/lib/wallet/{standard,context,signer}.ts
  ├─ cluster: devnet only        app/components/cluster-context.tsx
  ├─ reads                       app/lib/hooks/use-library.ts   (SWR, refetched after every confirm)
  ├─ writes                      app/lib/hooks/use-seed-actions.ts → use-send-transaction.ts
  ├─ PDAs, limits, photo hash    app/lib/seed-library.ts
  ├─ failures                    app/lib/errors.ts   (describeFailure, retryNetwork)
  └─ Codama client               app/generated/seed_library/   (from anchor/target/idl/seed_library.json)
                │
                ▼  JSON-RPC (public devnet, or NEXT_PUBLIC_EXPOFI_RPC_URL)
Solana program  anchor/programs/seed_library   EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby (devnet)
Tests           src/tests.rs (LiteSVM) · npm run devnet-smoke (live) · npm run e2e (browser, live)
```

## `seed_library` program (live on devnet: 5 of 7 instructions built)

`anchor/programs/seed_library/`. Program ID **`EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby`**, deployed to devnet on 7 Nov 2026. Upgrade authority: the deploy wallet (`Fd3H…5RRG`). Layout follows AGENT.md (UNIX philosophy, 5S Seiton):

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
└── tests.rs            # LiteSVM, 24 tests (22/22 mutants killed)
```

The program keypair lives in `anchor/target/deploy/seed_library-keypair.json`, which is gitignored. Since the deploy, upgrades need the **upgrade authority**, the deploy wallet, not this keypair. Keep the backup anyway: `scripts/program-keypair.mjs` restores it so that a clean build doesn't drift (K28).

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
| `join`               | member  | ✅ Day 2   | One membership per wallet per library (PDA `init` fails on repeat). **Open join**: no steward approval yet. A separate `payer` signer pays the rent                                                                                                              |
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

### Costs and limits

Compute units measured in LiteSVM on 22 Oct. **Rent measured on devnet on 7 Nov.** LiteSVM's rent is higher than devnet's, so its old lamport figures were wrong for real use (K38).

| Instruction    | Compute units | Account created | Rent paid by   | Devnet rent (lamports) |
| -------------- | ------------- | --------------- | -------------- | ---------------------- |
| `init_library` | 7,112         | Library, 89 B   | steward        | 1,102,360              |
| `add_lot`      | 11,789        | Lot, 280 B      | steward        | 2,072,640              |
| `join`         | 8,573         | Member, 82 B    | `payer` signer | 1,066,800              |
| `borrow`       | 22,961        | Loan, 155 B     | `payer` signer | 1,437,640              |
| `return_lot`   | 22,041        | Lot, 280 B      | `payer` signer | 2,072,640              |

- A test enforces a **40,000 CU budget** per instruction (max today 22,961).
- **A member pays 0.00458 SOL** on devnet for join + borrow + return, plus 5,000 lamports per transaction in fees. Nothing is ever closed, so the rent stays locked.
- **A sponsor can pay all of it** (K22): `join`, `borrow`, and `return_lot` take a separate `payer` signer, and paying grants no rights. The member still signs, and is still the contributor on any child lot. `npm run demo-seed` runs this on devnet with growers holding 0 SOL. **The app doesn't sponsor yet:** it would need something to co-sign for a browser user (K35).
- **Loans are not closed after return.** A loan is the member's receipt. Closing one later is a new instruction, not a migration.
- **The first deploy cost 1.287 SOL**, nearly all of it the program's rent (252,792 B). The buffer is refunded.

### Concurrency

Lot ids are a per-library sequence (`Library.lot_count`), so every `add_lot` and `return_lot` in a library writes the Library account and runs one at a time. If two clients build transactions from the same `lot_count`, the second fails with `2006 ConstraintSeeds`. `returnSeed` re-reads the library and rebuilds (`stale_lot_count_rejected_then_retry_succeeds`). `borrow` does the same for `loan_count`, because a lagging RPC node can return the old value right after a borrow (K31). At seed-library scale (a few returns a day) this is fine. A federation of busy libraries would need per-member lot ids instead.

### Keypair

`declare_id!` is `EqkK…LzZby`. The matching keypair is in `anchor/target/deploy/` (gitignored) and backed up to `~/.config/solana/expofi/seed_library-keypair.json` on the developer machine. A fresh or cleaned `cargo build-sbf` **generates a different keypair**, and tests still pass. `scripts/program-keypair.mjs` runs before builds, restores the real one from the backup, and moves the wrong one aside (K28). `npm run program-deploy` refuses to run unless the keypair matches `declare_id!`.

### Data off-chain

Photos and long notes stay off-chain. Only a 32-byte hash and a short note (≤80 chars, e.g. "18/20 germinated") go on-chain (TRIZ #2, taking out). The UI shows a lot's lineage by walking the `parent` pointers.

### Client

- **Generated:** `npm run codama:js` writes `app/generated/seed_library/` from the IDL. Output is deterministic and keeps Codama's own style (`app/generated` is prettier-ignored, K15).
- **One screen, the demo path:** `library-view.tsx` holds the lots (`lot-card.tsx`), the family tree (`lineage.tsx`), your card (`member-panel.tsx`, `return-form.tsx`), and a checklist (`try-it.tsx`). Steward actions aren't in the UI: the demo library is seeded by script, so there's no screen the demo doesn't use.
- **The borrow gate isn't hidden.** With an open loan, Borrow stays enabled and the program refuses it, because that refusal is the proof Solana is doing real work (PRODUCT.md, demo step 2). This is the one deliberate exception to AGENT.md's "disable the button when the program would reject it". Buttons are disabled only for what isn't a rule: no wallet, not joined, nothing left in the lot.
- **The refusal normally arrives before the wallet opens**, because Kit's planner simulates to estimate compute units before signing. If a lagging node simulated from an old state, the wallet would be asked and the program would still refuse on-chain, at the cost of a fee. The screen therefore says "Nothing changed", not "no fee".
- **Failures** go through `describeFailure` (`refused`, `cancelled`, `funds`, `network`, `expired`, `unknown`), each with its own title and next step. Refusals are clay, not red: nobody did anything wrong. `retryNetwork` retries 429s and dropped connections only, and a retry can't do anything twice, because a rebuilt transaction is refused on-chain.
- **Not knowing isn't "no".** Membership has a separate checking state, so a member is never told they aren't one while their card loads (K33).
- **Photos stay on the device.** Only the sha256 goes on-chain, and the screen says so. There's no photo host yet, so nobody else can see the photo behind a hash.
- **Config:** `NEXT_PUBLIC_EXPOFI_STEWARD` selects the library. `NEXT_PUBLIC_EXPOFI_RPC_URL` replaces the rate-limited public endpoint.

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
| Sponsor pays all rent; member pays nothing          | `sponsor_pays_all_rent_so_member_pays_nothing`            | ✅     |
| A sponsor can't act without the member's signature  | `sponsor_cannot_borrow_without_member_signature`          | ✅     |
| Forgive unblocks borrowing                          | (with `forgive`)                                          | ⏳     |

**Mutation check:** `npm run program-mutants` removes each of 22 rules in turn and requires a test to fail, and exits 1 on any survivor. Run it whenever a rule changes. History: 15/19 before 22 Oct's Day 4, 19/19 after, 22/22 with the three `payer` rules.

**Above the program:**

| Layer | Command                | What it proves                                                                                                                                                                                                                                                               |
| ----- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chain | `npm run devnet-smoke` | The rules on the live program, through the same client and error mapper as the app. Fresh library each run, about 0.02 SOL                                                                                                                                                   |
| App   | `npm run e2e`          | The demo path through the real UI in Chromium on live devnet with an injected Wallet Standard wallet, plus chaos: wallet rejection, RPC down, injected 429s, empty wallet. Each run costs about 0.03 SOL. Not a real wallet and not a stranger: **doesn't count toward M11** |

Neither runs in CI: both spend devnet SOL and depend on a rate-limited public endpoint.

## Decisions log

| Date       | Decision                                                     | Why                                                                                                                                              |
| ---------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 2026-10-18 | Build a custom program instead of integrating a protocol     | No existing protocol models loans that return offspring                                                                                          |
| 2026-10-18 | Keep `@solana/kit` 6.x for now                               | Template default; upgrade to Kit 8 as one deliberate change                                                                                      |
| 2026-10-18 | Bump Next.js to 16.4.2                                       | Critical RCE advisory in 16.3.4                                                                                                                  |
| 2026-10-18 | No token, no collateral                                      | Product constraint (see PRODUCT.md)                                                                                                              |
| 2026-10-21 | `return_lot` requires qty > 0 and a photo hash               | "Returned" must mean offspring exist; crop failure goes through `forgive`                                                                        |
| 2026-10-21 | `join` is open (no steward approval) for now                 | Unblocks the demo; revisit after coordinator interviews (K7)                                                                                     |
| 2026-10-21 | CI builds with `cargo build-sbf`, not `anchor build`         | No Anchor CLI in CI, and no way for CI to rewrite keys (K3)                                                                                      |
| 2026-10-22 | Error codes are append-only; `WrongLot` added as 6012        | Clients match on numbers; moving codes breaks them silently                                                                                      |
| 2026-10-22 | Text limits stay in bytes; messages and UI say so            | Account space is bytes; counting characters on-chain costs CU for nothing                                                                        |
| 2026-10-22 | Payer split and loan closing decided **before** deploy (K22) | Account layouts are cheap to change before deploy, expensive after                                                                               |
| 2026-11-07 | `payer` signer on `join`, `borrow`, `return_lot` (K22)       | A society can sponsor members. Paying grants no rights. Cheap before deploy, costly after                                                        |
| 2026-11-07 | Loans stay open as receipts after return (K22)               | Closing one later is additive, and no coordinator has asked for it                                                                               |
| 2026-11-07 | Deployed with 5 of 7 instructions                            | `forgive` waits on interviews; `Forgiven` is already in the layout, so it's an upgrade. Cost: a member whose crop fails stays blocked until then |
| 2026-11-07 | Run the pinned Anchor binary, never avm's shim (K29)         | Second time the shim has changed the machine (K19). Its platform-tools map disagrees with `cargo-build-sbf`                                      |
| 2026-11-07 | Borrow stays enabled during an open loan                     | The refusal is the demo's proof. The program is the guard either way                                                                             |
| 2026-11-07 | One page; no steward screens; devnet only, no cluster switch | Muda: the program exists nowhere else, and the demo doesn't use them                                                                             |
