"use client";

import { useCallback } from "react";
import type { Address } from "@solana/kit";
import {
  fetchLibrary,
  fetchMember,
  getBorrowInstructionAsync,
  getJoinInstructionAsync,
  getReturnLotInstructionAsync,
} from "../../generated/seed_library";
import { programErrorCode, retryNetwork, STALE_SEEDS } from "../errors";
import { loanPda, lotPda, memberPda } from "../seed-library";
import { useSolanaClient } from "../solana-client-context";
import { useWallet } from "../wallet/context";
import { useSendTransaction } from "./use-send-transaction";

const READ = { commitment: "confirmed" } as const;

export type ReturnedSeed = {
  loan: Address;
  lot: Address;
  qty: number;
  photoHash: Uint8Array;
  note: string;
};

/**
 * Join, borrow and return for the connected wallet.
 *
 * Each reads the sequence it depends on from the chain just before building,
 * never from the UI's cache. The member pays their own rent here, but the
 * program takes a separate payer, so a society can sponsor it later (K22).
 */
export function useSeedActions(library: Address | undefined) {
  const { signer } = useWallet();
  const { rpc } = useSolanaClient();
  const { send, isSending } = useSendTransaction();

  const join = useCallback(async () => {
    if (!signer || !library) throw new Error("Connect a wallet first");
    const instruction = await getJoinInstructionAsync({
      wallet: signer,
      payer: signer,
      library,
    });
    return retryNetwork(() => send({ instructions: [instruction] }));
  }, [library, send, signer]);

  const borrow = useCallback(
    async (lot: Address, qty: number) => {
      if (!signer || !library) throw new Error("Connect a wallet first");
      const member = await memberPda(library, signer.address);
      // The public RPC is load-balanced: right after a borrow, a lagging node can
      // return the old loan_count, so the seeds no longer match. Give it a moment
      // and re-read, rather than show an error (K31).
      for (let attempt = 0; ; attempt++) {
        try {
          return await retryNetwork(async () => {
            const { loanCount } = (await fetchMember(rpc, member, READ)).data;
            const instruction = await getBorrowInstructionAsync({
              wallet: signer,
              payer: signer,
              library,
              lot,
              loan: await loanPda(member, loanCount),
              qty,
            });
            return send({ instructions: [instruction] });
          });
        } catch (err) {
          if (programErrorCode(err) !== STALE_SEEDS || attempt >= 2) throw err;
          await new Promise((done) => setTimeout(done, 1500));
        }
      }
    },
    [library, rpc, send, signer]
  );

  const returnSeed = useCallback(
    async ({ loan, lot, qty, photoHash, note }: ReturnedSeed) => {
      if (!signer || !library) throw new Error("Connect a wallet first");
      // Lot ids are one sequence per library. If someone else's return lands
      // between our read and our send, the seeds no longer match: re-read and
      // rebuild (K23).
      for (let attempt = 0; ; attempt++) {
        try {
          return await retryNetwork(async () => {
            const { lotCount } = (await fetchLibrary(rpc, library, READ)).data;
            const instruction = await getReturnLotInstructionAsync({
              wallet: signer,
              payer: signer,
              library,
              loan,
              lot,
              childLot: await lotPda(library, lotCount),
              qty,
              photoHash,
              note,
            });
            const signature = await send({ instructions: [instruction] });
            return { signature, childId: lotCount };
          });
        } catch (err) {
          if (programErrorCode(err) !== STALE_SEEDS || attempt >= 2) throw err;
        }
      }
    },
    [library, rpc, send, signer]
  );

  return { join, borrow, returnSeed, isSending };
}
