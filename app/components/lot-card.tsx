"use client";

import { useState } from "react";
import type { Account, Address } from "@solana/kit";
import type { Lot } from "../generated/seed_library";
import { generationLabel, Lineage } from "./lineage";
import { INPUT_CLASS, PrimaryButton, SecondaryButton } from "./ui";

export type BorrowHint = "connect" | "checking" | "join" | null;

const BORROW_HINTS = {
  connect: "Connect a wallet to borrow.",
  checking: "Checking your library card…",
  join: "Join the library to borrow.",
};

export function LotCard({
  lot,
  byAddress,
  steward,
  highlighted,
  borrowHint,
  isSending,
  onBorrow,
  onLineageOpened,
  notice,
}: {
  lot: Account<Lot>;
  byAddress: Map<Address, Account<Lot>>;
  steward: Address;
  highlighted: boolean;
  /** Why this wallet can't borrow yet. An open loan isn't a reason: the program refuses that. */
  borrowHint: BorrowHint;
  isSending: boolean;
  onBorrow: (qty: number) => void;
  onLineageOpened: () => void;
  notice?: React.ReactNode;
}) {
  const { variety, qtyAvailable, generation, note } = lot.data;
  const [qty, setQty] = useState(() => Math.min(10, qtyAvailable) || 1);
  const [showLineage, setShowLineage] = useState(false);
  const empty = qtyAvailable === 0;
  const qtyValid = Number.isInteger(qty) && qty >= 1;

  return (
    <li
      data-testid={`lot-${lot.data.id}`}
      className={`rounded-xl border bg-card p-4 sm:p-5 ${highlighted ? "border-leaf" : "border-border"}`}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-display text-lg font-semibold">{variety}</h3>
        <p className="text-sm tabular-nums text-muted">
          {empty ? "All borrowed" : `${qtyAvailable} seeds in the tin`}
        </p>
      </div>
      <p className="mt-1 text-sm">
        <span className="font-medium text-clay">
          {generationLabel(generation)}
        </span>
        {note && <span className="text-muted"> · {note}</span>}
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div className="w-24">
          <label
            htmlFor={`qty-${lot.address}`}
            className="mb-1 block text-xs text-muted"
          >
            How many
          </label>
          <input
            id={`qty-${lot.address}`}
            type="number"
            inputMode="numeric"
            min={1}
            max={qtyAvailable || undefined}
            value={Number.isNaN(qty) ? "" : qty}
            disabled={empty}
            onChange={(e) => setQty(e.target.valueAsNumber)}
            className={`${INPUT_CLASS} tabular-nums`}
          />
        </div>
        <PrimaryButton
          disabled={empty || !qtyValid || borrowHint !== null || isSending}
          onClick={() => onBorrow(qty)}
        >
          {isSending ? "Working…" : "Borrow"}
        </PrimaryButton>
        <SecondaryButton
          aria-expanded={showLineage}
          onClick={() => {
            if (!showLineage) onLineageOpened();
            setShowLineage(!showLineage);
          }}
        >
          {showLineage ? "Hide family tree" : "Family tree"}
        </SecondaryButton>
      </div>

      {borrowHint && !empty && (
        <p className="mt-2 text-xs text-muted">{BORROW_HINTS[borrowHint]}</p>
      )}

      {notice && <div className="mt-4">{notice}</div>}

      {showLineage && (
        <Lineage lot={lot} byAddress={byAddress} steward={steward} />
      )}
    </li>
  );
}
