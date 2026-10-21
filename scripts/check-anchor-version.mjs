// Poka-yoke for the Anchor toolchain.
//
// Fails fast when the installed Anchor CLI does not match the anchor-lang
// version the programs depend on. Anchor 0.30.x silently rewrites declare_id!
// and Anchor.toml during `anchor build` (see docs/GENCHI_GENBUTSU.md), so this
// must run before any Anchor command touches the workspace.

import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const programsDir = join(import.meta.dirname, "..", "anchor", "programs");

function fail(message) {
  console.error(`\n✖ Anchor version check failed\n  ${message}\n`);
  console.error(
    "  Fix: avm install <version> && avm use <version>  (see README.md → Prerequisites)\n"
  );
  process.exit(1);
}

const required = new Set();
for (const program of readdirSync(programsDir)) {
  const cargoToml = readFileSync(
    join(programsDir, program, "Cargo.toml"),
    "utf8"
  );
  const match = cargoToml.match(/^anchor-lang\s*=\s*"=?([\d.]+)"/m);
  if (match) required.add(match[1]);
}

if (required.size !== 1) {
  fail(
    `Programs must share one anchor-lang version, found: ${[...required].join(", ") || "none"}`
  );
}
const [expected] = required;

let output;
try {
  output = execFileSync("anchor", ["--version"], { encoding: "utf8" });
} catch {
  fail("`anchor` is not installed or not on PATH.");
}

const installed = output.match(/anchor-cli\s+([\d.]+)/)?.[1];
if (!installed) fail(`Could not parse \`anchor --version\` output: ${output}`);

const majorMinor = (v) => v.split(".").slice(0, 2).join(".");
if (majorMinor(installed) !== majorMinor(expected)) {
  fail(
    `Installed anchor-cli ${installed}, but programs use anchor-lang ${expected}.`
  );
}

console.log(`✓ anchor-cli ${installed} matches anchor-lang ${expected}`);
