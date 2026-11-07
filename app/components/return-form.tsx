"use client";

import { useState, type FormEvent } from "react";
import type { Address } from "@solana/kit";
import type { Loan, Lot } from "../generated/seed_library";
import { byteLength, MAX_NOTE_BYTES, photoHash } from "../lib/seed-library";
import { INPUT_CLASS, PrimaryButton } from "./ui";

export type ReturnInput = {
  loan: Address;
  lot: Address;
  qty: number;
  photoHash: Uint8Array;
  note: string;
};

export function ReturnForm({
  loanAddress,
  loan,
  lot,
  isSending,
  onReturn,
}: {
  loanAddress: Address;
  loan: Loan;
  lot: Lot | undefined;
  isSending: boolean;
  onReturn: (input: ReturnInput) => void;
}) {
  const [qty, setQty] = useState(loan.qty);
  const [photo, setPhoto] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [photoMissing, setPhotoMissing] = useState(false);

  const noteBytes = byteLength(note);
  const noteTooLong = noteBytes > MAX_NOTE_BYTES;
  const qtyValid = Number.isInteger(qty) && qty >= 1;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!photo) {
      setPhotoMissing(true);
      return;
    }
    if (noteTooLong || !qtyValid) return;
    onReturn({
      loan: loanAddress,
      lot: loan.lot,
      qty,
      photoHash: await photoHash(photo),
      note,
    });
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4" noValidate>
      <h3 className="font-display text-lg font-semibold">
        Return your saved {lot?.variety ?? "seed"}
      </h3>
      <div>
        <label htmlFor="return-qty" className="mb-1 block text-sm font-medium">
          How many seeds did you save?
        </label>
        <input
          id="return-qty"
          type="number"
          inputMode="numeric"
          min={1}
          value={Number.isNaN(qty) ? "" : qty}
          onChange={(e) => setQty(e.target.valueAsNumber)}
          aria-invalid={!qtyValid}
          className={`${INPUT_CLASS} max-w-32 tabular-nums`}
        />
        {!qtyValid && (
          <p className="mt-1 text-xs text-destructive">
            At least one seed. If your crop failed, talk to your steward: that
            isn&rsquo;t a return.
          </p>
        )}
      </div>
      <div>
        <label
          htmlFor="return-photo"
          className="mb-1 block text-sm font-medium"
        >
          A photo of the seed
        </label>
        <input
          id="return-photo"
          type="file"
          accept="image/*"
          aria-invalid={photoMissing}
          aria-describedby="return-photo-help"
          onChange={(e) => {
            setPhoto(e.target.files?.[0] ?? null);
            setPhotoMissing(false);
          }}
          className="block w-full cursor-pointer text-sm file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-lg file:border file:border-border file:bg-card file:px-3 file:text-sm file:font-medium file:text-foreground"
        />
        <p id="return-photo-help" className="mt-1 text-xs text-muted">
          The photo stays on your device. Only its fingerprint goes on Solana.
        </p>
        {photoMissing && (
          <p className="mt-1 text-xs text-destructive">
            Returned seed needs a photo.
          </p>
        )}
      </div>
      <div>
        <label htmlFor="return-note" className="mb-1 block text-sm font-medium">
          How did it grow?{" "}
          <span className="font-normal text-muted">Optional</span>
        </label>
        <input
          id="return-note"
          type="text"
          autoComplete="off"
          placeholder="18 of 20 came up"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          aria-invalid={noteTooLong}
          aria-describedby="return-note-count"
          className={INPUT_CLASS}
        />
        <p
          id="return-note-count"
          className={`mt-1 text-xs tabular-nums ${noteTooLong ? "text-destructive" : "text-muted"}`}
        >
          {noteBytes} of {MAX_NOTE_BYTES} bytes
          {noteTooLong && ". Shorten it a little."}
        </p>
      </div>
      <PrimaryButton
        type="submit"
        disabled={isSending || noteTooLong || !qtyValid}
      >
        {isSending ? "Working…" : "Return seed"}
      </PrimaryButton>
    </form>
  );
}
