# CLAUDE.md

@AGENT.md

## Claude Code specifics

- The `solana-dev` skill is linked at `.claude/skills/solana-dev` (pointing to `.agents/skills/solana-dev`). Load its reference for the area you touch before writing code.
- Project MCP: `.mcp.json` (Solana Developer MCP).
- Stack decisions and build status: `.superstack/build-context.md`. Update `build_status` when a milestone actually passes. Verify by running it, not by reading code.
- Progress and open problems: `KAIZEN.md` (metrics table and kaizen newspaper). Add a row when you find a problem; re-measure when you fix one.
- Next step in the superstack journey: `/build-with-claude`.
- Verify before you claim anything. Commands that must pass (CI runs the same):

  ```bash
  npm run ci             # Next.js build, lint, prettier
  npm run program-test   # cargo build-sbf + LiteSVM tests (no Anchor CLI needed)
  ```

- Anchor commands go through `npm run anchor-build` / `npm run setup`, which run `npm run anchor-check` first. Never call `anchor build` directly: on a mismatched CLI it rewrites program IDs (K3 in KAIZEN.md).
- Don't run two `cargo` commands at the same time. They share the package-cache lock and the second one blocks silently (K10).
- When you pipe a long command into `tail`, use `set -o pipefail`, or a failure exits 0 (K9).
