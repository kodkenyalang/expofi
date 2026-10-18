# Roadmap

Four-week online hackathon, started Monday 12 October 2026, with three checkpoints. Each week ends with an IPD gate (see AGENT.md). **The constraint moves, so re-identify it each week** (Theory of Constraints).

## Week 1 (12–18 Oct): Concept gate

- [x] Scaffold `nextjs-anchor` template
- [x] Genchi genbutsu audit ([GENCHI_GENBUTSU.md](GENCHI_GENBUTSU.md))
- [x] Fix interrupted npm install, patch the Next.js critical advisory
- [x] Docs: README, AGENT.md, CLAUDE.md, PRODUCT, A3, ARCHITECTURE, ROADMAP
- [ ] **Install Anchor CLI 1.x** (`avm install 1.1.2`), the current constraint
- [ ] Talk to 5 seed-library or allotment coordinators; write down the happy path and failure path in their words
- [ ] Decide: borrower-only return vs steward attestation

## Week 2 (19–25 Oct): Plan gate (devnet flow works)

- [ ] `seed_library` program: `init_library`, `join`, `add_lot`, `borrow`, `return_lot`, `forgive`
- [ ] LiteSVM tests for every rule in [ARCHITECTURE.md](ARCHITECTURE.md#tests-required-before-any-devnet-deploy), plus chaos cases
- [ ] Own program keypair, deploy to devnet, regenerate Codama client
- [ ] Toolchain poka-yoke: script fails if `anchor --version` is not 1.x
- [ ] CI on GitHub Actions: `npm ci && npm run ci && cargo test`

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
