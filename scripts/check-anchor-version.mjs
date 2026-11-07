// Poka-yoke for the Anchor toolchain (KAIZEN.md K3, K4, K14, K19, K20).
//
// Fails fast when the installed toolchain does not match the pins:
//   anchor-lang (programs' Cargo.toml) == [toolchain] anchor_version == anchor CLI
//   [toolchain] solana_version == active solana CLI
// Program keypairs vs declare_id! are checked by scripts/program-keypair.mjs.
//
// Anchor 0.30.x silently rewrites declare_id! during `anchor build`, and the
// avm shim changes the machine when it runs (K19, K29). So this checks the
// pinned binary directly and never calls `anchor` on PATH (scripts/anchor.mjs).

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { pinnedAnchorBinary } from "./anchor.mjs";

const anchorDir = join(import.meta.dirname, "..", "anchor");
const programsDir = join(anchorDir, "programs");

function fail(message, fix) {
  console.error(`\n✖ Toolchain check failed\n  ${message}\n`);
  console.error(`  Fix: ${fix}\n`);
  process.exit(1);
}

function version(cmd, pattern) {
  try {
    const out = execFileSync(cmd, ["--version"], {
      cwd: anchorDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return out.match(pattern)?.[1];
  } catch (err) {
    fail(
      `\`${cmd} --version\` failed: ${String(err.stderr || err.message).trim()}`,
      `install ${cmd} (see README.md → Prerequisites)`
    );
  }
}

// --- Pins -------------------------------------------------------------------

const anchorToml = readFileSync(join(anchorDir, "Anchor.toml"), "utf8");
const toolchain =
  anchorToml.match(/\[toolchain\]([\s\S]*?)(?=\n\[|$)/)?.[1] ?? "";
const pinnedAnchor = toolchain.match(/anchor_version\s*=\s*"([^"]+)"/)?.[1];
const pinnedSolana = toolchain.match(/solana_version\s*=\s*"([^"]+)"/)?.[1];
if (!pinnedAnchor || !pinnedSolana) {
  fail(
    "anchor/Anchor.toml [toolchain] must pin anchor_version and solana_version.",
    "add both under [toolchain]"
  );
}

const programs = readdirSync(programsDir);
const crateVersions = new Set();
for (const program of programs) {
  const cargoToml = readFileSync(
    join(programsDir, program, "Cargo.toml"),
    "utf8"
  );
  const match = cargoToml.match(/^anchor-lang\s*=\s*"=?([\d.]+)"/m);
  if (match) crateVersions.add(match[1]);
}
if (crateVersions.size !== 1 || !crateVersions.has(pinnedAnchor)) {
  fail(
    `anchor-lang in programs (${[...crateVersions].join(", ") || "none"}) must equal [toolchain] anchor_version (${pinnedAnchor}).`,
    "align every program's anchor-lang with Anchor.toml"
  );
}

// --- Installed tools ----------------------------------------------------------

const anchorCli = version(pinnedAnchorBinary().binary, /anchor-cli\s+([\d.]+)/);
if (anchorCli !== pinnedAnchor) {
  fail(
    `Installed anchor-cli ${anchorCli}, pinned ${pinnedAnchor}.`,
    `avm install ${pinnedAnchor}  (add --from-source if GLIBC < 2.39)`
  );
}

const solanaCli = version("solana", /solana-cli\s+([\d.]+)/);
if (solanaCli !== pinnedSolana) {
  fail(
    `Active solana-cli ${solanaCli}, pinned ${pinnedSolana}. The avm shim can switch it (K19).`,
    `agave-install init ${pinnedSolana}`
  );
}

console.log(
  `✓ anchor-cli ${anchorCli} and solana-cli ${solanaCli} match anchor/Anchor.toml`
);
