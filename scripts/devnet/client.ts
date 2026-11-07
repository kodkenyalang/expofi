// Shared by the devnet scripts. Uses the same generated client and error
// mapping as the app, so a pass here says something about the app too.

import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  createKeyPairSignerFromBytes,
  generateKeyPairSigner,
  lamports,
  type Address,
  type Instruction,
  type TransactionSigner,
} from "@solana/kit";
import { createClient } from "@solana/kit-client-rpc";
import { getTransferSolInstruction } from "@solana-program/system";

export const DEVNET_URL = "https://api.devnet.solana.com";
export const READ = { commitment: "confirmed" } as const;

/** The deploy wallet. It pays for everything these scripts do. */
export async function loadWallet() {
  const path = join(homedir(), ".config", "solana", "id.json");
  const bytes = new Uint8Array(JSON.parse(readFileSync(path, "utf8")));
  return createKeyPairSignerFromBytes(bytes);
}

export function clientFor(payer: TransactionSigner) {
  return createClient({ url: DEVNET_URL, payer });
}

export type Client = ReturnType<typeof clientFor>;

const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

/** The public devnet RPC rate-limits and drops connections often (K30). */
export async function withRetry<T>(attempt: () => Promise<T>): Promise<T> {
  for (let tries = 1; ; tries++) {
    try {
      return await attempt();
    } catch (err) {
      const text = causes(err)
        .map((link) => (link instanceof Error ? link.message : String(link)))
        .join(" ");
      if (tries >= 8 || !/429|fetch failed|timeout|socket/i.test(text)) {
        throw err;
      }
      await sleep(1500 * tries);
    }
  }
}

function causes(err: unknown): unknown[] {
  const chain: unknown[] = [];
  for (let link = err; link; link = link instanceof Error ? link.cause : null) {
    chain.push(link);
  }
  return chain;
}

export async function send(client: Client, ...instructions: Instruction[]) {
  const result = await withRetry(() => client.sendTransaction(instructions));
  return result.context.signature;
}

/** A throwaway keypair holding `sol` devnet SOL, funded by the wallet. */
export async function fundedKeypair(client: Client, sol: number) {
  const signer = await generateKeyPairSigner();
  if (sol > 0) {
    await send(
      client,
      getTransferSolInstruction({
        source: client.payer,
        destination: signer.address,
        amount: lamports(BigInt(Math.round(sol * 1e9))),
      })
    );
  }
  return signer;
}

export async function balance(client: Client, address: Address) {
  const { value } = await withRetry(() =>
    client.rpc.getBalance(address, READ).send()
  );
  return value;
}

export async function photo(text: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text)
  );
  return new Uint8Array(digest);
}
