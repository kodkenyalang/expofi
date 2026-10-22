"""Mutation check for seed_library (Kaizen K18).

Removes or weakens one on-chain rule at a time, rebuilds, and runs the LiteSVM
tests. Every mutant must be KILLED (some test fails). A SURVIVED mutant is a
rule that no test guards. Exits 1 if any mutant survives.

Usage (from the repo root): npm run program-mutants
Always restores the original source, even on error or Ctrl-C.
"""
import subprocess
import sys
from pathlib import Path

ws = Path(sys.argv[1] if len(sys.argv) > 1 else "anchor")
src = ws / "programs/seed_library/src/instructions"

MUTANTS = [
    ("init: name check", "init_library.rs",
     "require!(\n            !name.is_empty() && name.len() <= MAX_NAME_LEN,\n            SeedLibraryError::InvalidName\n        );", ""),
    ("add_lot: steward has_one", "add_lot.rs",
     "#[account(mut, has_one = steward @ SeedLibraryError::NotSteward)]", "#[account(mut)]"),
    ("add_lot: variety check", "add_lot.rs",
     "require!(\n            !variety.is_empty() && variety.len() <= MAX_VARIETY_LEN,\n            SeedLibraryError::InvalidVariety\n        );", ""),
    ("add_lot: note length", "add_lot.rs",
     "require!(note.len() <= MAX_NOTE_LEN, SeedLibraryError::NoteTooLong);", ""),
    ("add_lot: qty > 0", "add_lot.rs",
     "require!(qty > 0, SeedLibraryError::InvalidQuantity);", ""),
    ("borrow: gate", "borrow.rs",
     "require!(self.member.open_loans == 0, SeedLibraryError::BorrowBlocked);", ""),
    ("borrow: qty > 0", "borrow.rs",
     "require!(qty > 0, SeedLibraryError::InvalidQuantity);", ""),
    ("borrow: qty <= available", "borrow.rs",
     "require!(\n            qty <= self.lot.qty_available,\n            SeedLibraryError::InsufficientSeed\n        );", ""),
    ("borrow: lot has_one library", "borrow.rs",
     "#[account(mut, has_one = library @ SeedLibraryError::WrongLibrary)]", "#[account(mut)]"),
    ("borrow: open_loans not set", "borrow.rs",
     "self.member.open_loans = 1;", ""),
    ("return: has_one member", "return_lot.rs",
     "has_one = member @ SeedLibraryError::NotBorrower,", ""),
    ("return: has_one lot", "return_lot.rs",
     "has_one = lot @ SeedLibraryError::WrongLot,", ""),
    ("return: status Open", "return_lot.rs",
     "constraint = loan.status == LoanStatus::Open @ SeedLibraryError::LoanNotOpen,", ""),
    ("return: qty > 0", "return_lot.rs",
     "require!(qty > 0, SeedLibraryError::InvalidQuantity);", ""),
    ("return: photo check", "return_lot.rs",
     "require!(photo_hash != [0u8; 32], SeedLibraryError::MissingPhoto);", ""),
    ("return: note length", "return_lot.rs",
     "require!(note.len() <= MAX_NOTE_LEN, SeedLibraryError::NoteTooLong);", ""),
    ("return: generation +1", "return_lot.rs",
     ".checked_add(1)\n                .ok_or(SeedLibraryError::Overflow)?,\n            contributor", ".checked_add(0)\n                .ok_or(SeedLibraryError::Overflow)?,\n            contributor"),
    ("return: gate not reopened", "return_lot.rs",
     "self.member.open_loans = 0;", ""),
    ("return: status not flipped", "return_lot.rs",
     "self.loan.status = LoanStatus::Returned;", ""),
]


def run(cmd):
    return subprocess.run(cmd, cwd=ws, capture_output=True, text=True)


results = []
for name, fname, old, new in MUTANTS:
    path = src / fname
    original = path.read_text()
    if original.count(old) != 1:
        results.append((name, "SKIPPED (pattern not found once)"))
        continue
    try:
        path.write_text(original.replace(old, new))
        b = run(["cargo", "build-sbf", "--manifest-path", "programs/seed_library/Cargo.toml"])
        if b.returncode != 0:
            results.append((name, "KILLED (does not compile)"))
            continue
        t = run(["cargo", "test", "-p", "seed_library"])
        failed = [l.split()[1] for l in t.stdout.splitlines() if l.startswith("test ") and l.endswith("FAILED")]
        results.append((name, f"KILLED by {', '.join(failed)}" if t.returncode != 0 else "SURVIVED"))
    finally:
        path.write_text(original)
    print(f"{name:32} {results[-1][1]}", flush=True)

# Rebuild the clean program so target/deploy matches source again.
run(["cargo", "build-sbf", "--manifest-path", "programs/seed_library/Cargo.toml"])
survivors = [n for n, r in results if r == "SURVIVED"]
skipped = [n for n, r in results if r.startswith("SKIPPED")]
print(f"\n{len(results) - len(survivors) - len(skipped)}/{len(results)} killed; survivors: {survivors}; skipped: {skipped}")
sys.exit(1 if survivors or skipped else 0)
