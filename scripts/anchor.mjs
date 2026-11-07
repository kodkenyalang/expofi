// Runs the Anchor CLI pinned in anchor/Anchor.toml, from anchor/, skipping the
// avm shim (KAIZEN.md K19, K29).
//
// `anchor` on PATH is avm's shim. On every call it may switch the machine's
// Solana CLI (K19), or, since avm 1.2, install the platform-tools its own map
// names and repoint the Solana release's sysroot at them (K29). That map says
// v1.57 for Solana 3.1.14; cargo-build-sbf 3.1.14 and CI use v1.52. The real
// binary is ~/.avm/bin/anchor-<version>, and it changes nothing but target/.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export const anchorDir = join(import.meta.dirname, "..", "anchor");

export function pinnedAnchorBinary() {
  const toml = readFileSync(join(anchorDir, "Anchor.toml"), "utf8");
  const pin = toml.match(/anchor_version\s*=\s*"([^"]+)"/)?.[1];
  const avmHome = process.env.AVM_HOME ?? join(homedir(), ".avm");
  return { pin, binary: join(avmHome, "bin", `anchor-${pin}`) };
}

if (import.meta.main ?? process.argv[1] === import.meta.filename) {
  const { pin, binary } = pinnedAnchorBinary();
  if (!existsSync(binary)) {
    console.error(
      `✖ ${binary} is missing. Install it: avm install ${pin} (add --from-source if GLIBC < 2.39)`
    );
    process.exit(1);
  }
  const { status } = spawnSync(binary, process.argv.slice(2), {
    cwd: anchorDir,
    stdio: "inherit",
  });
  process.exit(status ?? 1);
}
