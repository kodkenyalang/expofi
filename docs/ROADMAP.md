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
- [ ] `forgive`, `attest_germination`
- [x] LiteSVM tests for every rule built so far: 13 tests, exact error codes, mutation-checked ([ARCHITECTURE.md](ARCHITECTURE.md#tests))
- [ ] Chaos cases on the client side (RPC down, wallet reject, blockhash expiry)
- [x] Own program keypair (`EqkK…LzZby`)
- [ ] Deploy to devnet, regenerate Codama client
- [x] Toolchain poka-yoke: `npm run anchor-check` blocks `anchor-build`/`setup` when the CLI doesn't match `anchor-lang`
- [x] CI on GitHub Actions: web (`npm ci && npm run ci`) and program (`cargo build-sbf && cargo test`) jobs

## Week 3 (26 Oct–1 Nov): Availability gate (checkpoint demo)

- [ ] Replace the template UI (`/brand-design`, `/frontend-design-guidelines`)
- [ ] Screens: Library, Lot plus lineage, Borrow, Return, My loans. Every failure path gets a screen
- [ ] Clear lint and compiler warnings to 0 (5S: Seiso)
- [ ] Delete the template `vault` program and client (5S: Seiri)
- [ ] Unassisted stranger test: at least 3 people complete the flow
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
