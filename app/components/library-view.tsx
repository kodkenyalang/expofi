"use client";

import { useEffect, useMemo, useState } from "react";
import { lamports as sol, type Account, type Address } from "@solana/kit";
import { toast } from "sonner";
import type { Lot } from "../generated/seed_library";
import { describeFailure, type Failure } from "../lib/errors";
import { useBalance } from "../lib/hooks/use-balance";
import { useLibrary, useMembership } from "../lib/hooks/use-library";
import { useSeedActions } from "../lib/hooks/use-seed-actions";
import { DEMO_STEWARD, lotPda } from "../lib/seed-library";
import { useSolanaClient } from "../lib/solana-client-context";
import { useWallet } from "../lib/wallet/context";
import { useCluster } from "./cluster-context";
import { LotCard, type BorrowHint } from "./lot-card";
import { MemberPanel } from "./member-panel";
import type { ReturnInput } from "./return-form";
import { TryIt, type TryItStep } from "./try-it";
import { FailureNotice, SecondaryButton, TxLink } from "./ui";

const FAUCET = "https://faucet.solana.com/";

function sortLots(lots: Account<Lot>[]) {
  // Seed you can borrow first, then the order they entered the library.
  return [...lots].sort(
    (a, b) =>
      Number(b.data.qtyAvailable > 0) - Number(a.data.qtyAvailable > 0) ||
      Number(a.data.id - b.data.id)
  );
}

function count(n: number, noun: string) {
  return `${n} ${noun}${n === 1 ? "" : "s"}`;
}

type LotNotice = { lot: Address; failure: Failure };

export function LibraryView() {
  const { wallet } = useWallet();
  const { getExplorerUrl } = useCluster();
  const client = useSolanaClient();
  const address = wallet?.account.address;

  const library = useLibrary(DEMO_STEWARD);
  const libraryAddress = library.data?.address;
  const membership = useMembership(libraryAddress, address);
  const balance = useBalance(address);
  const { join, borrow, returnSeed, isSending } =
    useSeedActions(libraryAddress);

  const [failure, setFailure] = useState<Failure | null>(null);
  const [lotNotice, setLotNotice] = useState<LotNotice | null>(null);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [returned, setReturned] = useState<{
    childId: bigint;
    signature: string;
  } | null>(null);
  const [newLot, setNewLot] = useState<Address | null>(null);
  const [sawRefusal, setSawRefusal] = useState(false);
  const [sawLineage, setSawLineage] = useState(false);

  // The new lot's address is a PDA, which takes an await to derive.
  useEffect(() => {
    if (!returned || !libraryAddress) return;
    let cancelled = false;
    void lotPda(libraryAddress, returned.childId).then((found) => {
      if (!cancelled) setNewLot(found);
    });
    return () => {
      cancelled = true;
    };
  }, [returned, libraryAddress]);

  const lots = useMemo(() => library.data?.lots ?? [], [library.data?.lots]);
  const byAddress = useMemo(
    () => new Map(lots.map((lot) => [lot.address, lot])),
    [lots]
  );
  const sorted = useMemo(() => sortLots(lots), [lots]);

  const member = membership.data?.member ?? null;
  const openLoan = membership.data?.openLoan ?? null;
  const borrowedLot = openLoan ? byAddress.get(openLoan.data.lot) : undefined;

  const done = useMemo(() => {
    const steps = new Set<TryItStep>();
    if (member) steps.add("join");
    if (member && member.loanCount > 0) steps.add("borrow");
    if (sawRefusal) steps.add("blocked");
    if (member && member.returned > 0) steps.add("return");
    if (sawLineage) steps.add("lineage");
    return steps;
  }, [member, sawRefusal, sawLineage]);

  // Until the chain answers, we don't know. Saying "not a member" would be false.
  const checking = Boolean(address) && !membership.data;
  const borrowHint: BorrowHint = !address
    ? "connect"
    : checking
      ? "checking"
      : !member
        ? "join"
        : null;

  async function handleJoin() {
    setFailure(null);
    try {
      await join();
      toast.success("You're a member. Pick some seed.");
    } catch (err) {
      setFailure(describeFailure(err));
    }
  }

  async function handleBorrow(lot: Account<Lot>, qty: number) {
    setFailure(null);
    setLotNotice(null);
    setReturned(null);
    setNewLot(null);
    try {
      const signature = await borrow(lot.address, qty);
      toast.success(`Borrowed ${qty} seeds of ${lot.data.variety}.`, {
        description: <TxLink href={getExplorerUrl(`/tx/${signature}`)} />,
      });
    } catch (err) {
      const described = describeFailure(err);
      if (described.kind === "refused") setSawRefusal(true);
      setLotNotice({ lot: lot.address, failure: described });
    }
  }

  async function handleReturn(input: ReturnInput) {
    setFailure(null);
    setLotNotice(null);
    try {
      setReturned(await returnSeed(input));
    } catch (err) {
      setFailure(describeFailure(err));
    }
  }

  async function handleAirdrop() {
    if (!address) return;
    setIsAirdropping(true);
    setFailure(null);
    try {
      await client.airdrop(address, sol(1_000_000_000n));
      void balance.mutate();
      toast.success("1 devnet SOL received.");
    } catch {
      // The public faucet rate-limits almost everyone (K30). Say what to do next.
      toast.error("The automatic faucet is busy.", {
        description: (
          <span>
            Copy your address from the wallet menu and paste it into{" "}
            <TxLink href={FAUCET}>faucet.solana.com</TxLink>.
          </span>
        ),
        duration: 20000,
      });
    } finally {
      setIsAirdropping(false);
    }
  }

  if (library.error && !library.data) {
    return (
      <FailureNotice
        failure={describeFailure(library.error)}
        action={
          <SecondaryButton onClick={() => void library.mutate()}>
            Try again
          </SecondaryButton>
        }
      />
    );
  }

  if (!library.data) {
    return (
      <div
        className="space-y-4"
        aria-busy="true"
        aria-label="Loading the library"
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-36 rounded-xl border border-border bg-card motion-safe:animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (!library.data.library) {
    return (
      <p className="rounded-xl border border-border bg-card p-5 text-sm">
        This library hasn&rsquo;t been set up on devnet yet. If you run this
        app, run <code className="font-mono">npm run demo-seed</code>.
      </p>
    );
  }

  const { steward, name, memberCount } = library.data.library;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-2xl font-semibold">{name}</h2>
          <p className="text-sm tabular-nums text-muted">
            {count(lots.length, "lot")} · {count(memberCount, "member")}
          </p>
        </div>

        {lots.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-5 text-sm">
            The tin is empty. The steward hasn&rsquo;t added any seed yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {sorted.map((lot) => (
              <LotCard
                key={lot.address}
                lot={lot}
                byAddress={byAddress}
                steward={steward}
                highlighted={lot.address === newLot}
                borrowHint={borrowHint}
                isSending={isSending}
                onBorrow={(qty) => void handleBorrow(lot, qty)}
                onLineageOpened={() => {
                  if (lot.data.contributor === address) setSawLineage(true);
                }}
                notice={
                  lotNotice?.lot === lot.address ? (
                    <FailureNotice
                      failure={lotNotice.failure}
                      onDismiss={() => setLotNotice(null)}
                    />
                  ) : undefined
                }
              />
            ))}
          </ul>
        )}
      </div>

      <div className="order-first min-w-0 space-y-4 lg:sticky lg:top-6 lg:order-last">
        {returned && (
          <div
            role="status"
            className="rounded-xl border border-leaf bg-card p-4 text-sm"
          >
            <p className="font-semibold">Your seed is back in the library.</p>
            <p className="mt-1">
              It&rsquo;s a new lot, linked to the one you borrowed, for good.
              Open its family tree below. You can borrow again.{" "}
              <TxLink href={getExplorerUrl(`/tx/${returned.signature}`)} />
            </p>
          </div>
        )}
        {failure && (
          <FailureNotice failure={failure} onDismiss={() => setFailure(null)} />
        )}
        <MemberPanel
          connected={Boolean(address)}
          checking={checking}
          checkFailure={
            membership.error && !membership.data ? (
              <FailureNotice
                failure={describeFailure(membership.error)}
                action={
                  <SecondaryButton onClick={() => void membership.mutate()}>
                    Try again
                  </SecondaryButton>
                }
              />
            ) : null
          }
          balance={balance.lamports}
          isAirdropping={isAirdropping}
          member={member}
          openLoanAddress={openLoan?.address}
          openLoan={openLoan?.data ?? null}
          borrowedLot={borrowedLot?.data}
          isSending={isSending}
          onAirdrop={() => void handleAirdrop()}
          onJoin={() => void handleJoin()}
          onReturn={(input) => void handleReturn(input)}
        />
        <TryIt done={done} />
      </div>
    </div>
  );
}
