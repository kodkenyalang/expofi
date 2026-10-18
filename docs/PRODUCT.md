# Product: ExpoFi

## One sentence

A seed library ledger where every loan expects **offspring** (saved seed and a germination note), and a member with an open loan can't borrow again.

## Buyer

**Primary:** the volunteer coordinator of a community seed library, allotment society, or seed swap. Today they run it from a paper ledger, a shared spreadsheet, or a Facebook group. Example: a UK allotment association with a seed tin in the shed and 40–200 members.

**User:** the member who borrows a packet in spring and is supposed to bring saved seed back in autumn.

**Not the buyer:** commercial seed companies, carbon-credit buyers, "all gardeners everywhere".

## The job

1. Steward lists a **lot** (variety, quantity, where it came from).
2. Member **borrows** some or all of it.
3. Months later, member **returns** saved seed: quantity, a photo, a germination note. The return becomes a **child lot** whose parent is the borrowed lot.
4. Until that loan is returned (or the steward forgives it), the member **can't borrow again**.
5. Anyone can follow a lot's **lineage**: this tomato descends from that tomato, grown in this library, for five seasons.

## Why this is new

Crypto "lending" means collateralised USDC. Tool libraries expect the same item back. A seed library expects **the next generation**. That is a different primitive, and it is already a civic habit run on paper. A search found no visible incumbent doing this on-chain. The claim is "no visible incumbent", not "first ever". Don't say "first ever" on camera.

## How Solana powers it (the on-camera sentence)

> "When Sam tries to borrow again before returning last spring's beans, the Solana program refuses. When Sam returns them, the new lot's parent is written on-chain forever."

Acceptable proof (from the hackathon brief): a state change the user can see because a rule fired. Here that means the borrow gate and the lineage link.

## Demo script (2–4 minutes)

1. **Person and problem** (20 s): coordinator with the paper ledger; half the beans never came back.
2. **Failure first** (30 s): Sam has an open loan and taps Borrow. The program rejects it with a plain-language error.
3. **Success** (60 s): Sam returns saved seed with a photo. A child lot appears. Sam's next borrow succeeds.
4. **Lineage** (30 s): tap a lot and see its ancestry back three generations.
5. **One sentence on Solana** (10 s).
6. **What the accelerator would do** (20 s): federation between libraries, season reports, a paid tier for societies.

Time is compressed in the demo, and the video **says so**.

## Constraints (not open questions)

- **No token. No yield. No collateral.** The token version of loyalty and DAOs died in the Graveyard; the job survived.
- **No public "bad borrower" list.** A blocked borrow is visible only to the member and their steward.
- **Crop failure is not punished.** A germination note saying "0/20 came up" is valuable data. Only _non-return_ blocks borrowing.
- Not a carbon credit, not a marketplace.

## Kill criteria

- If the demo needs a token chart, it has fallen into the graveyard.
- If we can't name five real seed libraries we've spoken to by the end of week 1, revisit the idea (see the ranking in the original research).
- If the UI is a JSON form, it reads as infra, not a consumer app.

## Open questions

- Who signs the return: the borrower alone, or the borrower plus a steward attestation?
- Should the steward be a single key or a Squads multisig for larger societies?
- Wallet onboarding for non-crypto gardeners: embedded wallet (e.g. Privy) vs wallet-standard only?
- Photo storage: IPFS/Arweave vs the society's own host (only the hash goes on-chain either way).
