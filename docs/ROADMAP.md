# Roadmap

Four-week online hackathon, started Monday 12 October 2026, with three checkpoints. Each week ends with an IPD gate (see AGENT.md). **The constraint moves, so re-identify it each week** (Theory of Constraints).

## Week 1 (12–18 Oct): Concept gate

- [x] Scaffold `nextjs-anchor` template
- [x] Genchi genbutsu audit ([GENCHI_GENBUTSU.md](GENCHI_GENBUTSU.md))
- [x] Fix interrupted npm install, patch the Next.js critical advisory
- [x] Docs: README, AGENT.md, CLAUDE.md, PRODUCT, A3, ARCHITECTURE, ROADMAP
- [x] Install Anchor CLI 1.1.2 (done 21 Oct, from source; see GENCHI_GENBUTSU audit 2)
- [ ] **Talk to 5 seed-library or allotment coordinators; write down the happy path and failure path in their words.** Carried into week 2. This is now the constraint
- [ ] Decide: borrower-only return vs steward attestation

## Week 2 (19–25 Oct): Plan gate (devnet flow works)

- [x] `seed_library` program core: `init_library`, `join`, `add_lot`, `borrow`, `return_lot` (Days 2–3, 21 Oct)
- [ ] `forgive`, `attest_germination`. Deliberately not built: waiting on interviews. Until then a member whose crop fails stays blocked
- [x] LiteSVM tests for every rule built so far: 22 tests, exact error codes, 19/19 mutants killed ([ARCHITECTURE.md](ARCHITECTURE.md#tests))
- [x] Genchi genbutsu audit 3 (deep and wide) on days 1–3; all high findings fixed (22 Oct)
- [x] Interview kit: script mapped to the four open decisions, anonymised note template ([interviews/](interviews/README.md))
- [x] **Decide before deploy (K22):** `payer` signer built; loans stay open as receipts
- [x] Chaos cases on the client side: RPC down, wallet reject, 429s, empty wallet in `npm run e2e` (7 Nov). Blockhash expiry is mapped to a message but not injected
- [x] Own program keypair (`EqkK…LzZby`)
- [x] Deploy to devnet (7 Nov, 1.287 SOL; `EqkK…LzZby`, hash matches the local build), regenerate Codama client
- [x] Toolchain poka-yoke: `npm run anchor-check` blocks `anchor-build`/`setup` when the CLI doesn't match `anchor-lang`
- [x] CI on GitHub Actions: web (`npm ci && npm run ci`) and program (`cargo build-sbf && cargo test`) jobs

## Week 3 (26 Oct–1 Nov): Availability gate (checkpoint demo)

- [x] Replace the template UI (7 Nov; palette chosen by the agent, `brand.md`)
- [x] One page: library, lots with family tree, borrow, return, your card. Every failure path gets a screen
- [x] Clear lint and compiler warnings to 0 (5S: Seiso)
- [x] Delete the template `vault` program and client (5S: Seiri)
- [ ] **Host the app (K36), then fix the faucet step (K35),** then run the unassisted stranger test: at least 3 people complete the flow. M11 = 0
- [x] Browser E2E on live devnet (`npm run e2e`). A machine, so it doesn't count as a stranger
- [ ] `/review-and-iterate`, `/cso`

## Week 4 (2–8 Nov): Submission

- [ ] 2–4 minute video: person and problem, failure, success, Solana sentence, accelerator ask (`/marketing-video`)
- [ ] `/submit-to-hackathon`
- [ ] Final genchi genbutsu audit appended

## Later (accelerator)

- Federation between libraries (lots move between societies, and lineage follows them)
- Season reports for societies (germination rates per variety)
- Upgrade to `@solana/kit` 8 plugin clients and transaction v1
- Mobile (`/build-mobile`) for use in the shed
