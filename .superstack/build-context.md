# Build context

Phase 2 (Build) handoff, written by `scaffold-project` on 2026-10-18.

```json
{
  "project": "expofi",
  "idea": {
    "name": "Seed library that expects offspring",
    "source": "idea-research.md, novel ten #5",
    "track": "Encode x Solana 2026: Best Consumer App on Solana",
    "space": "novel / long-tail civic habit"
  },
  "stack": {
    "starter_repo": "create-solana-dapp -t solana-foundation/templates/kit/nextjs-anchor",
    "frontend": "Next.js 16.4.2, React 19.2.3, Tailwind v4",
    "solana_client": "@solana/kit 6.10 + wallet-standard",
    "brand": "brand.md",
    "program": "Anchor (anchor-lang 1.1.2), Codama-generated TS client",
    "tests": "LiteSVM",
    "skills_installed": [
      "solana-dev (solana-foundation/solana-dev-skill, pinned in skills-lock.json)"
    ],
    "mcps_configured": ["solana-mcp (https://mcp.solana.com/mcp) in .mcp.json"],
    "repos_cloned": ["solana-foundation/templates kit/nextjs-anchor"]
  },
  "architecture": {
    "pattern": "Next.js + Anchor dApp",
    "key_decisions": [
      "Custom program: no existing protocol models loans that return offspring",
      "No token, no yield, no collateral",
      "Borrow gate enforced on-chain: member.open_loans == 0",
      "Return creates child Lot with parent pointer (lineage)",
      "All PDAs seeded with library key (blast-radius isolation)",
      "Photos off-chain, 32-byte hash on-chain"
    ],
    "docs": "docs/ARCHITECTURE.md"
  },
  "build_status": {
    "mvp_complete": false,
    "tests_passing": true,
    "devnet_deployed": true,
    "ui_replaced": true
  },
  "program": {
    "name": "seed_library",
    "id": "EqkKhhUF8yBnxHEXT2E8B4sdh36N4E4hHjqVRPbLzZby",
    "instructions_built": [
      "init_library",
      "join",
      "add_lot",
      "borrow",
      "return_lot"
    ],
    "instructions_pending": ["forgive", "attest_germination"],
    "litesvm_tests": 24,
    "mutation_score": "22/22",
    "devnet_library": "2YrnN8Nhw1iyUkMurjVsq1bHAuA1bs6fwNA73GDHMpAP (steward Fd3HfM9udQn3ti9Acy2LnmqesBtnqbTwN69kS1ss5RRG)",
    "keypair_backup": "~/.config/solana/expofi/seed_library-keypair.json (dev machine only)"
  },
  "toolchain": {
    "anchor_cli": "1.1.2 (avm, built from source; GLIBC 2.35)",
    "solana_cli": "3.1.14",
    "pinned_in": "anchor/Anchor.toml [toolchain]",
    "guard": "npm run anchor-check (checks pins against the pinned binary, never the avm shim; restores the program keypair)",
    "runner": "scripts/anchor.mjs runs ~/.avm/bin/anchor-1.1.2 directly (K29). anchor on PATH is broken on this machine: truncated ~/.cache/solana/v1.57"
  },
  "ci": ".github/workflows/ci.yml (web + program), green on first run 2026-10-21",
  "blockers": [
    "No public URL, so no stranger test (K36). M11 = 0",
    "A fresh wallet needs devnet SOL and the faucet rate-limits (K35)",
    "0 of 5 seed-library coordinator interviews (M10); forgive waits on these",
    "Demo video and submission not started (TC3, due 8 Nov)"
  ],
  "verified_2026_11_07": {
    "npm_run_ci": "pass, 0 lint warnings",
    "npm_run_program_test": "24 tests + test_id, 0 warnings",
    "npm_run_program_mutants": "22/22 killed",
    "deployed_hash_matches_local": "d8dc1014629e834d...",
    "npm_run_devnet_smoke": "12 checks pass on live devnet",
    "npm_run_e2e": "demo path and chaos pass in Chromium on live devnet (injected wallet, not a stranger)",
    "member_cost_devnet_lamports": 4577080,
    "deploy_cost_sol": 1.287,
    "npm_audit_prod": "0 vulnerabilities"
  },
  "verified_2026_10_22": {
    "fresh_clone": "npm ci + npm run ci + npm run program-test pass",
    "npm_run_program_test": "seed_library 22/22, vault 4/4",
    "npm_run_program_mutants": "19/19 killed",
    "max_compute_units": "22961 (borrow), budget 40000",
    "member_cost_per_cycle_lamports": 6285960,
    "github_actions_run": "39746072066 success (checkout v7, setup-node v7, ubuntu-24.04)",
    "npm_audit_prod": "0 vulnerabilities",
    "cargo_audit": "0 vulnerabilities, 6 warnings (offline DB 2026-10-17)",
    "secrets_in_git_history": "none"
  },
  "verified_2026_10_21": {
    "npm_run_ci": "pass (0 errors, 3 template lint warnings)",
    "npm_run_setup": "pass",
    "npm_run_program_test": "seed_library 13/13, vault 4/4",
    "seed_library_warnings": 0,
    "mutation_check": "removing the borrow gate fails its test",
    "github_actions_run": "39590915650 success",
    "npm_audit_prod": "0 vulnerabilities"
  },
  "verified_2026_10_18": {
    "npm_run_build": "pass",
    "eslint": "0 errors, 3 warnings",
    "tsc": "pass",
    "prettier": "pass",
    "template_vault_cargo_test": "4/4 pass (template program, not ExpoFi)",
    "npm_audit_prod": "0 vulnerabilities"
  }
}
```

`tests_passing` covers the 5 instructions built so far (24 tests, 22/22 mutants killed on 2026-11-07). `forgive` and `attest_germination` still need tests. `mvp_complete` stays `false` until a stranger has finished the flow.

**Next:** host the app and run a stranger test, then the video and `/submit-to-hackathon`.
