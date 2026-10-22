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
    "devnet_deployed": false
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
    "litesvm_tests": 22,
    "mutation_score": "19/19",
    "keypair_backup": "~/.config/solana/expofi/seed_library-keypair.json (dev machine only)"
  },
  "toolchain": {
    "anchor_cli": "1.1.2 (avm, built from source; GLIBC 2.35)",
    "solana_cli": "3.1.14",
    "pinned_in": "anchor/Anchor.toml [toolchain]",
    "guard": "npm run anchor-check (runs from anchor/, checks anchor and solana pins, warns on keypair mismatch)"
  },
  "ci": ".github/workflows/ci.yml (web + program), green on first run 2026-10-21",
  "blockers": [
    "0 of 5 seed-library coordinator interviews (the current constraint; TC1 missed on this only)",
    "K22: decide sponsor-paid rent and loan closing before the first devnet deploy"
  ],
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

`tests_passing` became `true` on 2026-10-21, when the **seed_library** tests passed locally and in CI. It covers the 5 instructions built so far (22 tests, 19/19 mutants killed on 2026-10-22). `forgive` and `attest_germination` still need tests.

**Next:** `/build-with-claude`.
