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
    "tests_passing": false,
    "devnet_deployed": false
  },
  "blockers": [
    "Anchor CLI 0.30.1 installed; project requires 1.x (avm install 1.1.2)"
  ],
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

`tests_passing` stays `false` until the **seed_library** program's tests pass. The template vault tests passing doesn't count.

**Next:** `/build-with-claude`.
