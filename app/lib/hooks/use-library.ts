"use client";

import useSWR from "swr";
import type { Account, Address } from "@solana/kit";
import { useCluster } from "../../components/cluster-context";
import { useSolanaClient } from "../solana-client-context";
import {
  fetchAllMaybeLot,
  fetchLoan,
  fetchMaybeLibrary,
  fetchMaybeMember,
  type Lot,
} from "../../generated/seed_library";
import { libraryPda, loanPda, lotPda, memberPda } from "../seed-library";

const READ = { commitment: "confirmed" } as const;

/** A library and every lot in it, root and returned. */
export function useLibrary(steward: Address) {
  const { cluster } = useCluster();
  const { rpc } = useSolanaClient();

  return useSWR(["library", cluster, steward] as const, async () => {
    const address = await libraryPda(steward);
    const library = await fetchMaybeLibrary(rpc, address, READ);
    if (!library.exists) return { address, library: null, lots: [] };

    // Lot ids are a 0..lot_count sequence. getMultipleAccounts takes 100 at a time.
    const ids = Array.from({ length: Number(library.data.lotCount) }, (_, i) =>
      BigInt(i)
    );
    const addresses = await Promise.all(ids.map((id) => lotPda(address, id)));
    const batches = [];
    for (let i = 0; i < addresses.length; i += 100) {
      batches.push(fetchAllMaybeLot(rpc, addresses.slice(i, i + 100), READ));
    }
    const lots = (await Promise.all(batches))
      .flat()
      .filter((lot): lot is Account<Lot> & { exists: true } => lot.exists);
    return { address, library: library.data, lots };
  });
}

/** The connected wallet's membership of a library, and its open loan if any. */
export function useMembership(library?: Address, wallet?: Address) {
  const { cluster } = useCluster();
  const { rpc } = useSolanaClient();

  return useSWR(
    library && wallet ? (["member", cluster, library, wallet] as const) : null,
    async ([, , lib, owner]) => {
      const address = await memberPda(lib, owner);
      const member = await fetchMaybeMember(rpc, address, READ);
      if (!member.exists) return { address, member: null, openLoan: null };

      // The borrow gate allows one open loan, so it is always the latest one.
      const openLoan =
        member.data.openLoans > 0
          ? await fetchLoan(
              rpc,
              await loanPda(address, member.data.loanCount - 1),
              READ
            )
          : null;
      return { address, member: member.data, openLoan };
    }
  );
}
