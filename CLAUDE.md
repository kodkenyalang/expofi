# CLAUDE.md

@AGENT.md

## Claude Code specifics

- The `solana-dev` skill is linked at `.claude/skills/solana-dev` (pointing to `.agents/skills/solana-dev`). Load its reference for the area you touch before writing code.
- Project MCP: `.mcp.json` (Solana Developer MCP).
- Stack decisions and build status: `.superstack/build-context.md`. Update `build_status` when a milestone actually passes. Verify by running it, not by reading code.
- Next step in the superstack journey: `/build-with-claude`.
- Verify before you claim anything. Commands that must pass:

  ```bash
  npm run ci
  cd anchor && cargo test
  ```

- Anchor CLI must be 1.x. If `anchor --version` prints 0.30.x, don't run `anchor build` (it rewrites program IDs). Use `cargo build-sbf --manifest-path programs/vault/Cargo.toml` instead, and tell the user.
