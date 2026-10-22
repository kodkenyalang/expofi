// Poka-yoke for the Anchor toolchain (KAIZEN.md K3, K4, K14, K19, K20).
//
// Fails fast when the installed toolchain does not match the pins:
//   anchor-lang (programs' Cargo.toml) == [toolchain] anchor_version == anchor CLI
//   [toolchain] solana_version == active solana CLI
// Warns when a deploy keypair in target/deploy does not match declare_id!,
// because deploying from this machine would then target the wrong address.
//
// Anchor 0.30.x silently rewrites declare_id! during `anchor build`, and the
// avm 1.x shim switches the machine's Solana CLI to match the directory it
// runs in. So every Anchor call here runs from anchor/, where the pins live.

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const anchorDir = join(import.meta.dirname, "..", "anchor");
const programsDir = join(anchorDir, "programs");

function fail(message, fix) {
  console.error(`\n✖ Toolchain check failed\n  ${message}\n`);
  console.error(`  Fix: ${fix}\n`);
  process.exit(1);
}

function version(cmd, pattern) {
  try {
    // cwd = anchor/ so avm resolves [toolchain] from Anchor.toml (K19)
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

const anchorCli = version("anchor", /anchor-cli\s+([\d.]+)/);
if (anchorCli !== pinnedAnchor) {
  fail(
    `Installed anchor-cli ${anchorCli}, pinned ${pinnedAnchor}.`,
    `avm install ${pinnedAnchor} && avm use ${pinnedAnchor}  (add --from-source if GLIBC < 2.39)`
  );
}

const solanaCli = version("solana", /solana-cli\s+([\d.]+)/);
if (solanaCli !== pinnedSolana) {
  fail(
    `Active solana-cli ${solanaCli}, pinned ${pinnedSolana}. Running \`anchor\` outside anchor/ can switch it (K14).`,
    `cd anchor && anchor --version   (avm re-activates ${pinnedSolana})`
  );
}

console.log(
  `✓ anchor-cli ${anchorCli} and solana-cli ${solanaCli} match anchor/Anchor.toml`
);

// --- Deploy keypairs vs declare_id! (warning only) ---------------------------

const BASE58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58(bytes) {
  let n = BigInt("0x" + Buffer.from(bytes).toString("hex"));
  let out = "";
  while (n > 0n) {
    out = BASE58[Number(n % 58n)] + out;
    n /= 58n;
  }
  for (const b of bytes) {
    if (b !== 0) break;
    out = "1" + out;
  }
  return out;
}

for (const program of programs) {
  const keypairPath = join(
    anchorDir,
    "target",
    "deploy",
    `${program}-keypair.json`
  );
  const libRs = join(programsDir, program, "src", "lib.rs");
  if (!existsSync(keypairPath) || !existsSync(libRs)) continue;
  const declared = readFileSync(libRs, "utf8").match(
    /declare_id!\("([^"]+)"\)/
  )?.[1];
  // A Solana keypair file is 64 bytes: secret key (32) then public key (32).
  const keypairAddress = base58(
    JSON.parse(readFileSync(keypairPath, "utf8")).slice(32)
  );
  if (declared && keypairAddress !== declared) {
    console.warn(
      `⚠ ${program}: target/deploy keypair is ${keypairAddress}, declare_id! is ${declared}. Deploying from this machine would target the wrong address.`
    );
  }
}
