"use client";

import type { Address, Lamports } from "@solana/kit";
import type { Loan, Lot, Member } from "../generated/seed_library";
import { ReturnForm, type ReturnInput } from "./return-form";
import { PrimaryButton, SecondaryButton } from "./ui";

// join + borrow + return costs about 0.0046 SOL of rent plus fees on devnet (M14).
const ENOUGH_FOR_THE_LOOP = 10_000_000n;

export function MemberPanel({
  connected,
  checking,
  checkFailure,
  balance,
  isAirdropping,
  member,
  openLoanAddress,
  openLoan,
  borrowedLot,
  isSending,
  onAirdrop,
  onJoin,
  onReturn,
}: {
  connected: boolean;
  /** Membership hasn't loaded yet. Not knowing isn't the same as not a member. */
  checking: boolean;
  /** Membership couldn't be read. Shown with its own retry. */
  checkFailure: React.ReactNode;
  balance: Lamports | null;
  isAirdropping: boolean;
  member: Member | null;
  openLoanAddress: Address | undefined;
  openLoan: Loan | null;
  borrowedLot: Lot | undefined;
  isSending: boolean;
  onAirdrop: () => void;
  onJoin: () => void;
  onReturn: (input: ReturnInput) => void;
}) {
  const needsSol = balance !== null && balance < ENOUGH_FOR_THE_LOOP;

  return (
    <section
      aria-labelledby="your-card"
      className="rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <h2 id="your-card" className="font-display text-xl font-semibold">
        Your library card
      </h2>

      {!connected && (
        <p className="mt-2 text-sm">
          Connect a Solana wallet to join. It&rsquo;s the only sign-up there is.
        </p>
      )}

      {checking && !checkFailure && (
        <div
          aria-busy="true"
          aria-label="Checking your library card"
          className="mt-3 h-10 rounded-lg bg-cream motion-safe:animate-pulse"
        />
      )}

      {checkFailure && <div className="mt-3">{checkFailure}</div>}

      {connected && needsSol && (
        <div className="mt-3 rounded-lg bg-cream p-3 text-sm">
          <p>
            This demo runs on Solana&rsquo;s test network. You need a little
            free devnet SOL to hold your records.
          </p>
          <SecondaryButton
            className="mt-2"
            disabled={isAirdropping}
            onClick={onAirdrop}
          >
            {isAirdropping ? "Asking the faucet…" : "Get free devnet SOL"}
          </SecondaryButton>
        </div>
      )}

      {connected && !checking && !member && (
        <div className="mt-3">
          <p className="text-sm">You aren&rsquo;t a member yet.</p>
          <PrimaryButton className="mt-2" disabled={isSending} onClick={onJoin}>
            {isSending ? "Working…" : "Join the library"}
          </PrimaryButton>
        </div>
      )}

      {member && !openLoan && (
        <p className="mt-2 text-sm">
          You&rsquo;re a member with no open loan, and you&rsquo;ve returned{" "}
          <span className="tabular-nums">{member.returned}</span>{" "}
          {member.returned === 1 ? "lot" : "lots"}. Pick some seed below.
        </p>
      )}

      {member && openLoan && openLoanAddress && (
        <>
          <p className="mt-2 text-sm">
            You borrowed{" "}
            <span className="tabular-nums font-medium">{openLoan.qty}</span>{" "}
            seeds of{" "}
            <span className="font-medium">
              {borrowedLot?.variety ?? "this lot"}
            </span>{" "}
            on{" "}
            {new Date(Number(openLoan.borrowedAt) * 1000).toLocaleDateString()}.
            You can&rsquo;t borrow again until they come back.
          </p>
          <ReturnForm
            key={openLoanAddress}
            loanAddress={openLoanAddress}
            loan={openLoan}
            lot={borrowedLot}
            isSending={isSending}
            onReturn={onReturn}
          />
        </>
      )}
    </section>
  );
}
