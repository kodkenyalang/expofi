"use client";

import { isSome, type Account, type Address } from "@solana/kit";
import type { Lot } from "../generated/seed_library";
import { ellipsify } from "../lib/explorer";
import { useCluster } from "./cluster-context";

type LotAccount = Account<Lot>;

/** The lot's ancestry, newest first, by following parent pointers on-chain. */
export function ancestry(lot: LotAccount, byAddress: Map<Address, LotAccount>) {
  const chain = [lot];
  let current = lot;
  while (isSome(current.data.parent)) {
    const parent = byAddress.get(current.data.parent.value);
    if (!parent) break;
    chain.push(parent);
    current = parent;
  }
  return chain;
}

export function generationLabel(generation: number) {
  return generation === 0 ? "Root lot" : `Generation ${generation}`;
}

export function Lineage({
  lot,
  byAddress,
  steward,
}: {
  lot: LotAccount;
  byAddress: Map<Address, LotAccount>;
  steward: Address;
}) {
  const { getExplorerUrl } = useCluster();
  const chain = ancestry(lot, byAddress);

  return (
    <ol
      aria-label={`Ancestry of ${lot.data.variety}`}
      className="mt-3 border-l-2 border-leaf/40 pl-4"
    >
      {chain.map((entry, i) => (
        <li key={entry.address} className="relative pb-3 last:pb-0">
          <span
            aria-hidden="true"
            className={`absolute -left-[1.4rem] top-1.5 h-2.5 w-2.5 rounded-full ${i === 0 ? "bg-leaf" : "bg-leaf/40"}`}
          />
          <p className="text-sm font-medium">
            {generationLabel(entry.data.generation)}
            <span className="font-normal text-muted">
              {" · "}
              {entry.data.contributor === steward
                ? "given by the steward"
                : `grown by ${ellipsify(entry.data.contributor, 4)}`}
              {" · "}
              {new Date(
                Number(entry.data.createdAt) * 1000
              ).toLocaleDateString()}
            </span>
          </p>
          {entry.data.note && (
            <p className="text-sm text-foreground/80">
              &ldquo;{entry.data.note}&rdquo;
            </p>
          )}
          <a
            href={getExplorerUrl(`/address/${entry.address}`)}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-muted underline underline-offset-2"
          >
            {ellipsify(entry.address, 6)}
          </a>
        </li>
      ))}
    </ol>
  );
}
