// Poka-yoke for program keypairs (KAIZEN.md K20, K28).
//
// target/ is gitignored and gets wiped. When target/deploy/<program>-keypair.json
// is missing, `cargo build-sbf` silently generates a new one, and a deploy from
// it lands at an address where every instruction fails DeclaredProgramIdMismatch.
//
//   node scripts/program-keypair.mjs           restore from the backup if missing
//                                              or wrong; never fails (tests don't
//                                              need the real key)
//   node scripts/program-keypair.mjs --strict  same, then exit 1 unless every
//                                              program's keypair matches declare_id!
//                                              (run before any deploy)
//
// The backup lives outside the repo: ~/.config/solana/expofi/<program>-keypair.json.
// A wrong keypair is moved aside, never deleted.

import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const strict = process.argv.includes("--strict");
const only = process.argv.find((a) => a.startsWith("--program="))?.slice(10);
const anchorDir = join(import.meta.dirname, "..", "anchor");
const programsDir = join(anchorDir, "programs");
const deployDir = join(anchorDir, "target", "deploy");
const backupDir = join(homedir(), ".config", "solana", "expofi");

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

// A Solana keypair file is 64 bytes: secret key (32) then public key (32).
function addressOf(path) {
  return base58(JSON.parse(readFileSync(path, "utf8")).slice(32));
}

let problems = 0;
for (const program of readdirSync(programsDir)) {
  if (only && program !== only) continue;
  const libRs = join(programsDir, program, "src", "lib.rs");
  if (!existsSync(libRs)) continue;
  const declared = readFileSync(libRs, "utf8").match(
    /declare_id!\("([^"]+)"\)/
  )?.[1];
  if (!declared) continue;

  const file = `${program}-keypair.json`;
  const keypair = join(deployDir, file);
  const backup = join(backupDir, file);
  const current = existsSync(keypair) ? addressOf(keypair) : null;
  if (current === declared) continue;

  const backupMatches = existsSync(backup) && addressOf(backup) === declared;
  if (backupMatches) {
    mkdirSync(deployDir, { recursive: true });
    if (current) {
      const aside = `${keypair}.wrong-${current.slice(0, 8)}`;
      renameSync(keypair, aside);
      console.warn(`⚠ ${program}: moved wrong keypair ${current} to ${aside}`);
    }
    copyFileSync(backup, keypair);
    chmodSync(keypair, 0o600);
    console.log(`✓ ${program}: restored keypair ${declared} from ${backup}`);
    continue;
  }

  problems++;
  const what = current
    ? `target/deploy keypair is ${current}, declare_id! is ${declared}`
    : `no keypair in target/deploy (build-sbf will generate a throwaway one)`;
  const log = strict ? console.error : console.warn;
  log(
    `${strict ? "✖" : "⚠"} ${program}: ${what}, and no matching backup at ${backup}. Fine for tests, wrong for deploy.`
  );
}

if (strict && problems > 0) {
  console.error(
    "\n  Deploying now would target the wrong address. Get the program keypair from a teammate over a secure channel."
  );
  process.exit(1);
}
