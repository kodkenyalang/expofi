import {
  address,
  getAddressEncoder,
  getProgramDerivedAddress,
  getU32Encoder,
  getU64Encoder,
  type Address,
} from "@solana/kit";
import { SEED_LIBRARY_PROGRAM_ADDRESS } from "../generated/seed_library";

// PDAs, mirroring the seeds in anchor/programs/seed_library/src/instructions/.
// Every seed includes the library (directly or via the member), so one
// library's accounts can't be passed into another's instructions.

const addressBytes = getAddressEncoder();

async function pda(
  seeds: Parameters<typeof getProgramDerivedAddress>[0]["seeds"]
) {
  const [found] = await getProgramDerivedAddress({
    programAddress: SEED_LIBRARY_PROGRAM_ADDRESS,
    seeds,
  });
  return found;
}

export function libraryPda(steward: Address) {
  return pda(["library", addressBytes.encode(steward)]);
}

export function memberPda(library: Address, wallet: Address) {
  return pda([
    "member",
    addressBytes.encode(library),
    addressBytes.encode(wallet),
  ]);
}

export function lotPda(library: Address, id: bigint) {
  return pda(["lot", addressBytes.encode(library), getU64Encoder().encode(id)]);
}

export function loanPda(member: Address, index: number) {
  return pda([
    "loan",
    addressBytes.encode(member),
    getU32Encoder().encode(index),
  ]);
}

// The demo library on devnet is the one run by this steward key. Override with
// NEXT_PUBLIC_EXPOFI_STEWARD to point the app at another library.
export const DEMO_STEWARD = address(
  process.env.NEXT_PUBLIC_EXPOFI_STEWARD ??
    "Fd3HfM9udQn3ti9Acy2LnmqesBtnqbTwN69kS1ss5RRG"
);

// Limits from state.rs. They are bytes, not characters (K21): "青菜" is 6 bytes.
export const MAX_NOTE_BYTES = 80;

export function byteLength(value: string) {
  return new TextEncoder().encode(value).length;
}

/** sha256 of the photo. Only this fingerprint goes on-chain (TRIZ #2). */
export async function photoHash(file: Blob): Promise<Uint8Array> {
  return new Uint8Array(
    await crypto.subtle.digest("SHA-256", await file.arrayBuffer())
  );
}
