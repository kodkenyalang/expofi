# CLAUDE.md

@AGENT.md

## Claude Code specifics

- The `solana-dev` skill is linked at `.claude/skills/solana-dev` (pointing to `.agents/skills/solana-dev`). Load its reference for the area you touch before writing code.
- Project MCP: `.mcp.json` (Solana Developer MCP).
- Stack decisions and build status: `.superstack/build-context.md`. Update `build_status` when a milestone actually passes. Verify by running it, not by reading code.
- Progress and open problems: `KAIZEN.md` (metrics table and kaizen newspaper). Add a row when you find a problem; re-measure when you fix one.
- Next step in the superstack journey: `/build-with-claude`.
- Verify before you claim anything. Commands that must pass (CI runs the first two):

  ```bash
  npm run ci             # Next.js build, lint, prettier
  npm run program-test   # cargo build-sbf + LiteSVM tests (no Anchor CLI needed)
  npm run program-mutants  # when you add or change an on-chain rule: every mutant must be killed
  ```

- Anchor commands go through `npm run anchor-build` / `npm run setup`, which run `npm run anchor-check` first. Never call `anchor build` directly: on a mismatched CLI it rewrites program IDs (K3 in KAIZEN.md).
- Run `anchor` only from `anchor/`. Anywhere else, the avm shim falls back to its global default and switches the machine's Solana CLI (K19). `npm run anchor-check` repairs that.
- Error codes in `error.rs` are append-only. Add new errors at the end; never reorder.
- Before any deploy, `npm run anchor-check` must show **no** keypair warning for the program being deployed (K20).
- Don't run two `cargo` commands at the same time. They share the package-cache lock and the second one blocks silently (K10).
- When you pipe a long command into `tail`, use `set -o pipefail`, or a failure exits 0 (K9).
