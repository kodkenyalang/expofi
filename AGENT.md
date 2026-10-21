# AGENT.md

Operating manual for any agent (Claude Code, Codex, Cursor, a human) working in this repo. Read it before you change anything.

**ExpoFi** is a seed library that expects offspring: borrow a seed lot, return saved seed plus a germination note, and you can't borrow again while a loan is open. See [docs/PRODUCT.md](docs/PRODUCT.md).

---

## Part 1: Solana skills

### 1.1 Project-pinned skill (in the repo)

| Skill        | Path                                 | Source                                                                  |
| ------------ | ------------------------------------ | ----------------------------------------------------------------------- |
| `solana-dev` | `.agents/skills/solana-dev/SKILL.md` | `solana-foundation/solana-dev-skill`, hash-pinned in `skills-lock.json` |

`.claude/skills/solana-dev` is a symlink to the same folder so that Claude Code auto-loads it. Load the matching reference **before** writing code in that area:

| Working on                           | Read                                                                                                                                    |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Anchor program, accounts, PDAs       | `references/programs/anchor.md`, `references/programs/design-patterns.md`                                                               |
| Anchor 0.32 → 1.x issues             | `references/anchor/migrating-v0.32-to-v1.md`                                                                                            |
| Pinocchio (only if CU-bound)         | `references/programs/pinocchio.md`                                                                                                      |
| Security review                      | `references/security.md`                                                                                                                |
| Tests (LiteSVM / Mollusk / Surfpool) | `references/testing.md`, `references/surfpool/*.md`                                                                                     |
| `@solana/kit` client code            | `references/kit/overview.md`, `kit/accounts.md`, `kit/codecs.md`, `kit/gotchas.md`, `kit/plugins.md`, `kit/react.md`, `kit/advanced.md` |
| Kit program clients                  | `references/kit/programs/{system,token,token-2022,compute-budget}.md`                                                                   |
| Codama / IDL client generation       | `references/idl-codegen.md`, `references/kit/codama.md`                                                                                 |
| Wallet + frontend                    | `references/frontend.md`                                                                                                                |
| web3.js interop / migration          | `references/kit-web3-interop.md`                                                                                                        |
| Transaction v1 (SIMD-0385)           | `references/transactions-v1.md`                                                                                                         |
| Payments                             | `references/payments.md`                                                                                                                |
| Confidential transfers               | `references/confidential-transfers.md`                                                                                                  |
| Toolchain / version mismatch         | `references/compatibility-matrix.md`, `references/common-errors.md`                                                                     |
| Concepts (rent, accounts, CPIs)      | `references/concepts.md`                                                                                                                |
| Quick on-chain lookups               | `references/rpc-quick-lookups.md`                                                                                                       |
| Further links                        | `references/resources.md`                                                                                                               |

> **Version note:** `solana-dev` defaults to `@solana/kit` 8 plugin clients and transaction v1. This repo is on `@solana/kit` 6.10 (template default). Don't mix the two styles in one file. Upgrading to Kit 8 is a deliberate, separate change (see [docs/ROADMAP.md](docs/ROADMAP.md)).

### 1.2 Superstack Solana skills (user-level, `~/.claude/skills/`)

Invoke with `/<name>` in Claude Code. Grouped by the Idea → Build → Launch journey.

**Idea and validation**

| Skill                   | Use when                                                       |
| ----------------------- | -------------------------------------------------------------- |
| `find-next-crypto-idea` | Discovering or ranking what to build                           |
| `validate-idea`         | Running a validation sprint (talk to seed librarians first)    |
| `competitive-landscape` | Mapping who else does this                                     |
| `colosseum-copilot`     | Searching 5,400+ Solana hackathon projects for similar entries |
| `defillama-research`    | Protocol health / TVL checks before integrating anything       |

**Learning**

| Skill                      | Use when                                 |
| -------------------------- | ---------------------------------------- |
| `solana-beginner`          | Onboarding a teammate new to Solana      |
| `virtual-solana-incubator` | Deep dive: SVM, Rust, PDAs, CPIs, Anchor |

**Build**

| Skill                 | Use when                                                      |
| --------------------- | ------------------------------------------------------------- |
| `scaffold-project`    | Stack and starter decisions (already run; see `.superstack/`) |
| `build-with-claude`   | Step-by-step MVP implementation (**next step**)               |
| `debug-program`       | Failing transaction, program error code, stuck instruction    |
| `build-data-pipeline` | Indexing loans/lots, webhooks, analytics                      |
| `build-mobile`        | A React Native / Expo version for the allotment               |
| `build-defi-protocol` | Not for this project. Listed for completeness                 |
| `launch-token`        | **Not for this project.** ExpoFi has no token, by design      |

**Frontend craft**

| Skill                        | Use when                                    |
| ---------------------------- | ------------------------------------------- |
| `brand-design`               | Picking the palette and type before UI work |
| `design-taste`               | Direction and anti-slop review              |
| `frontend-design-guidelines` | Any component or page work                  |
| `number-formatting`          | Displaying quantities, dates, counts        |
| `page-load-animations`       | Entrance choreography, list staggers        |

**Quality and security**

| Skill                | Use when                                   |
| -------------------- | ------------------------------------------ |
| `review-and-iterate` | Code review for production readiness       |
| `cso`                | Security audit, threat model, supply chain |
| `product-review`     | Balanced UX and onboarding review          |
| `roast-my-product`   | Harsh critique before judges see it        |

**Launch**

| Skill                 | Use when                                    |
| --------------------- | ------------------------------------------- |
| `deploy-to-mainnet`   | Devnet → mainnet checklist (post-hackathon) |
| `submit-to-hackathon` | Encode submission, README, video script     |
| `create-pitch-deck`   | Accelerator interview deck                  |
| `marketing-video`     | 2–4 minute demo video (Remotion)            |
| `video-craft`         | Frame-level polish for the video            |
| `apply-grant`         | Superteam / Solana Earn grant application   |

**Meta**

| Skill             | Use when                                  |
| ----------------- | ----------------------------------------- |
| `navigate-skills` | Finding the right skill, repo, or MCP     |
| `learn`           | Recording and recalling project learnings |

### 1.3 MCP

`.mcp.json` configures the official **Solana Developer MCP** (`https://mcp.solana.com/mcp`) for docs and Anchor/Solana Q&A. Optional: add Helius (`claude mcp add helius -- npx -y helius-mcp@latest`, needs `HELIUS_API_KEY`) when we need indexed reads or webhooks.

---

## Part 2: Working principles

Each principle comes with the concrete rule it implies **in this repo**. If a rule and a principle conflict, the rule wins until someone changes the rule in a PR.

### Multi-layered and cross-sectional Genchi Genbutsu (現地現物, "go and see")

Never reason about the system from memory, a README, or a template's claims. Go and look at the real thing, **at every layer** (toolchain → dependencies → program → generated client → UI → devnet → the actual seed librarian) and **across layers** (does the ID in `lib.rs` match `Anchor.toml`, the generated client, and what is deployed?).

- Before a fix, reproduce it. Before a claim, run the command. Paste the output.
- Cross-check program IDs in all four places: `lib.rs`, `Anchor.toml`, `app/generated/*/programs/*.ts`, `solana program show <id> --url devnet`.
- The first audit is [docs/GENCHI_GENBUTSU.md](docs/GENCHI_GENBUTSU.md). It found three defects that every doc had missed. Re-run it at each checkpoint.
- The last layer is people: talk to five seed-library volunteers before building a screen they did not ask for.

### Systems Thinking (Donella Meadows)

Model the library as **stocks** (seed in each lot, member trust) and **flows** (borrow, return, fail).

- **Feedback loop:** failed returns → fewer lots → stricter stewards → fewer borrows. The borrow gate is a _balancing_ loop. Make sure it can't drain the library into a death spiral (a steward-only "forgive" path exists for that reason).
- **Delays:** a growing season is a 4–9 month delay between borrow and return. Design every screen for that delay. The demo compresses time and **says so on camera**.
- **Leverage points:** change the _rules_ (borrow gate, lineage) before the _parameters_ (quantities, deadlines). Rules are on-chain. Parameters are config.

### Ishikawa root-cause analysis (fishbone)

Every bug that reaches a demo or devnet gets a fishbone in its PR or issue. Bones: **Method** (process/scripts), **Machine** (toolchain, RPC, wallet), **Material** (dependencies, IDL, data), **Man** (assumption or knowledge gap), **Measurement** (tests that did not catch it), **Mother Nature** (environment: WSL, network, devnet faucet limits). Combine with 5 Whys on the fattest bone. Fix the root, not the symptom.

### Lean / TPS

- **Jidoka (stop the line):** if `npm run ci` or `cargo test` fails, stop feature work and fix it. Never push red.
- **Just-in-time:** build the instruction the next demo step needs, not the one after.
- **Muda:** no speculative abstractions, no unused template code once replaced, no screens that are not on the demo path.
- **Andon:** surface a broken assumption immediately (an issue, or a line in chat), don't work around it silently.

### A3 thinking

Any non-trivial change (new instruction, account layout change, toolchain upgrade) starts as an A3: background, current state (measured), target, root cause, countermeasures, plan, follow-up. It fits on one page or it is not understood yet. Project-level A3: [docs/A3.md](docs/A3.md).

### Huawei IPD (Integrated Product Development)

Treat the hackathon as an IPD funnel with explicit **decision checkpoints** that match Encode's three checkpoints:

| IPD gate         | ExpoFi gate                               | Pass criteria                                                    |
| ---------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| Concept DCP      | Week 1: buyer and rule written down       | 5 seed-library conversations; happy path and failure path agreed |
| Plan DCP         | Week 2: devnet flow a stranger can finish | Borrow → return → blocked-borrow works end-to-end on devnet      |
| Availability DCP | Week 3–4: checkpoint demo, then video     | Video shows person, failure, success, one sentence on Solana     |

Cross-functional by default: product, program, client, and video are planned together, not handed off. Market-driven: requirements come from librarians, not from what Anchor makes easy.

### Theory of Constraints

Find the one constraint, **exploit** it, **subordinate** everything else to it, **elevate** it, then repeat.

- 18 Oct 2026: **toolchain** (Anchor CLI 0.30.1 vs program 1.x). Elevated 21 Oct: Anchor 1.1.2 installed, guarded, and pinned.
- **Current constraint (21 Oct): access to real seed librarians** (0 of 5 interviews). The program is ahead of what we know about the buyer. Subordinate: don't build `forgive`, steward approval, or UI flows past what an interview has confirmed.
- Next likely constraint: **the demo video**. Don't polish UI while the constraint is elsewhere.

### Poka-Yoke (mistake-proofing)

Make the wrong thing impossible, not just discouraged.

- **On-chain:** every account constraint (`seeds`, `has_one`, `constraint =`) is a poka-yoke. The borrow gate is enforced in the program, never only in the UI.
- **Typed client:** never hand-write instruction data. Use the Codama client in `app/generated/` and regenerate it, don't edit it.
- **Toolchain:** scripts must fail loudly on the wrong Anchor version. Never "fix" a program ID by hand. A silent `declare_id!` rewrite is exactly the defect class this rule targets.
- **UI:** disable the Borrow button when the program would reject it, but treat the program as the guard.

### UNIX philosophy

- One instruction does one thing: `borrow`, `return_lot`, `attest_germination`, `forgive`. No `do_everything(action: u8)`.
- Compose through accounts and the IDL, which is our "text stream" between program, client, and indexer.
- Small, sharp modules in `app/lib/`. Pipes over frameworks: `build → sign → send → confirm` stays a visible pipeline (`app/lib/send-transaction.ts`).
- Silence is golden: no console noise in success paths. Errors are human-readable (`app/lib/errors.ts`).

### Distributed systems

Solana is a distributed system and the browser is an unreliable client.

- The chain is the source of truth. Client state is a cache: refetch after every confirmed transaction.
- Blockhashes expire. Retries must rebuild and re-sign, and **instructions must be idempotent or reject duplicates** (a lot can only be returned once).
- Know the commitment level you read at (`confirmed` for UI, `finalized` for anything that gates money or trust).
- RPCs disagree for a few slots. Never assume read-your-own-write across two different endpoints.
- Partial failure is normal: wallet rejected, RPC 429, faucet rate-limited (observed on devnet). Every one needs a screen.

### Chaos Engineering

Inject failure on purpose before judges do it by accident.

- In LiteSVM/Surfpool tests: duplicate return, return by a non-borrower, borrow with open loan, clock warp past the season deadline, account closed mid-flow.
- In the client: kill the RPC, reject the signature, expire the blockhash, switch clusters mid-transaction.
- Each experiment has a hypothesis ("the borrow gate holds when…") and is kept as a regression test.

### Blast-radius minimisation

- **Devnet only** until after the hackathon. No real funds, and no token, so a bug costs a re-deploy, not a refund.
- **Per-library PDAs:** one library's state can't touch another's. Seeds always include the library key.
- **Upgrade authority** on a team-held keypair, never committed. `*.json` keypairs stay out of git (`anchor/target/` is ignored).
- **Small commits, small PRs:** one concern per commit so `git revert` is surgical.
- **Feature behind the program, not the UI:** UI changes can ship independently of program upgrades.

### Dragonwell / AJDK ethos

Alibaba's Dragonwell (the open build of its internal AJDK) runs in Alibaba's own production at scale before it ships, stays upstream-compatible, and upstreams its fixes instead of forking. For us:

- **Dogfood first:** the team runs a real (tiny) seed library on devnet before claiming anything works.
- **Stay upstream-compatible:** track `create-solana-dapp`, Anchor, and `@solana/kit` releases. Keep local divergence minimal and documented.
- **Upstream fixes:** if we find a template or toolchain bug (for example, the `--ignore-keys` vs Anchor 0.30 trap), report it upstream.
- **LTS mindset:** pin versions (`package-lock.json`, `Cargo.lock`, `skills-lock.json`) and upgrade deliberately.

### Samsung TRIZ

When two requirements fight, don't compromise. Resolve the contradiction using the inventive principles. Aim for the **Ideal Final Result**: _the seed returns itself_.

| Contradiction                                      | TRIZ principle           | Resolution                                                                    |
| -------------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| Need trust, but no collateral or token             | Separation in time       | Trust comes from history: an open loan blocks the next one                    |
| Lineage must be permanent, but data must be cheap  | #2 Taking out            | Store a 32-byte photo hash on-chain, photo off-chain                          |
| Seasons take months, demo takes minutes            | #10 Preliminary action   | Pre-seeded demo library; time compression said on camera                      |
| Must block bad actors, but not punish crop failure | #22 Blessing in disguise | A failed germination note is _data_ the library wants; only non-return blocks |

### Ikigai

Build only where all four circles overlap. Re-check at each IPD gate:

- **What the world needs:** seed sovereignty, local adaptation, a civic habit that already exists.
- **What we are good at:** Solana programs, clean consumer UX.
- **What can be paid for:** accelerator story, a per-society subscription for lineage, reporting, and multi-library federation.
- **What we love:** if nobody on the team wants to talk to a seed librarian, pick a different idea.

### Omotenashi (おもてなし, anticipatory hospitality)

The allotment member is a guest. Anticipate the need before it is spoken.

- No seed-phrase lecture. Explain a wallet in one sentence or hide it.
- Every failure screen says what happened, why, and what to do next, in plain words (`app/lib/errors.ts`).
- Pre-fill what we already know (last lot borrowed, the society's season dates).
- Respect time: nothing on the demo path takes more than one tap more than paper did.

### 5S (applied to the repo)

| S                          | Rule                                                                                                                       |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Seiri** (sort)           | Delete template code (vault, "Anchor Vault" hero) once the seed-library equivalent lands.                                  |
| **Seiton** (set in order)  | One instruction per file in `programs/*/src/instructions/`. Docs live in `docs/`.                                          |
| **Seiso** (shine)          | Zero lint warnings, zero compiler warnings. 3 + 3 exist today, so pay them down.                                           |
| **Seiketsu** (standardize) | `npm run ci` and `npm run program-test` are the standard, enforced in CI. Prettier formats everything, including Markdown. |
| **Shitsuke** (sustain)     | Re-run the genchi genbutsu audit each checkpoint. Keep this file current.                                                  |

### Kaizen (改善)

Small, continuous, measured improvements, all the time. One improvement per commit, with a before/after number when there is one (build time, warning count, CU used, taps to borrow). Every retro yields at least one change to this file or to `docs/`.

The 30-day plan, target conditions, and the kaizen newspaper (action log) live in [KAIZEN.md](KAIZEN.md). Ask the five coaching questions at the start of each session and log every improvement there.

---

## Part 3: Hard rules

1. Run `npm run ci` and `npm run program-test` before every push. CI (`.github/workflows/ci.yml`) runs the same two gates. Don't push red.
2. Never edit `app/generated/` by hand. Regenerate with `npm run codama:js`.
3. Never change a program ID by hand, and never commit keypairs, `.env*`, or `anchor/target/`.
4. Program rules live in the program. The UI only mirrors them.
5. No token, no yield, no collateral, no public "bad borrower" list. These are product constraints, not open questions.
6. Write commit messages in the imperative, scoped (`program: add borrow gate`). Keep commits small.
7. Record new findings in `docs/GENCHI_GENBUTSU.md` with the command and the output.
