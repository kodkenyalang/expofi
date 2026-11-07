// The direction in KAIZEN.md, against the real devnet program, without a browser:
// join -> borrow -> blocked borrow -> return -> lineage -> borrow again.
//
//   npm run devnet-smoke
//
// Uses a fresh library and member each run, so it never touches the demo library.
// Exits 1 on the first rule that doesn't hold. Each run costs about 0.02 SOL.

import { isSome } from "@solana/kit";
import {
  fetchLibrary,
  fetchLoan,
  fetchLot,
  fetchMember,
  getAddLotInstruction,
  getBorrowInstructionAsync,
  getInitLibraryInstructionAsync,
  getJoinInstructionAsync,
  getReturnLotInstructionAsync,
  LoanStatus,
} from "../../app/generated/seed_library";
import { describeFailure, programErrorCode } from "../../app/lib/errors";
import {
  libraryPda,
  loanPda,
  lotPda,
  memberPda,
} from "../../app/lib/seed-library";
import {
  balance,
  clientFor,
  fundedKeypair,
  loadWallet,
  photo,
  READ,
  send,
  withRetry,
} from "./client";

function check(name: string, ok: boolean, detail = "") {
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`
  );
  if (!ok) process.exit(1);
}

async function refusedWith(
  code: number,
  name: string,
  attempt: () => Promise<unknown>
) {
  try {
    await attempt();
  } catch (err) {
    const failure = describeFailure(err);
    check(
      name,
      programErrorCode(err) === code,
      `${code}: "${failure.message}"`
    );
    return failure;
  }
  check(name, false, "the transaction succeeded");
}

async function main() {
  const wallet = await loadWallet();
  const funder = clientFor(wallet);
  const steward = await fundedKeypair(funder, 0.01);
  const robin = await fundedKeypair(funder, 0.02);
  const stewardClient = clientFor(steward);
  const client = clientFor(robin);

  const library = await libraryPda(steward.address);
  await send(
    stewardClient,
    await getInitLibraryInstructionAsync({
      steward,
      library,
      name: "Smoke test",
    })
  );
  const root = await lotPda(library, 0n);
  await send(
    stewardClient,
    getAddLotInstruction({
      steward,
      library,
      lot: root,
      variety: "Smoke bean",
      qty: 50,
      note: "",
      photoHash: await photo("root"),
    })
  );

  const shared = { wallet: robin, payer: robin, library };
  const member = await memberPda(library, robin.address);
  const startBalance = await balance(client, robin.address);

  await send(client, await getJoinInstructionAsync(shared));
  check(
    "join",
    (await withRetry(() => fetchMember(client.rpc, member, READ))).data
      .wallet === robin.address
  );

  const loan0 = await loanPda(member, 0);
  await send(
    client,
    await getBorrowInstructionAsync({
      ...shared,
      lot: root,
      loan: loan0,
      qty: 10,
    })
  );
  check(
    "borrow",
    (await withRetry(() => fetchLot(client.rpc, root, READ))).data
      .qtyAvailable === 40
  );

  const blocked = await refusedWith(
    6006,
    "blocked borrow refused by the program",
    async () =>
      send(
        client,
        await getBorrowInstructionAsync({
          ...shared,
          lot: root,
          loan: await loanPda(member, 1),
          qty: 1,
        })
      )
  );
  check("failure reads as a program refusal", blocked?.kind === "refused");
  check(
    "blocked borrow changed nothing",
    (await withRetry(() => fetchLot(client.rpc, root, READ))).data
      .qtyAvailable === 40 &&
      (await withRetry(() => fetchMember(client.rpc, member, READ))).data
        .loanCount === 1
  );

  // What a lagging RPC node causes: aiming at the loan account that already exists.
  try {
    await send(
      client,
      await getBorrowInstructionAsync({
        ...shared,
        lot: root,
        loan: loan0,
        qty: 1,
      })
    );
    check("stale loan_count refused", false, "the transaction succeeded");
  } catch (err) {
    const stale = describeFailure(err);
    check(
      "stale loan_count maps to a plain message",
      programErrorCode(err) === 2006,
      stale.message
    );
  }

  const childId = (
    await withRetry(() => fetchLibrary(client.rpc, library, READ))
  ).data.lotCount;
  const child = await lotPda(library, childId);
  await send(
    client,
    await getReturnLotInstructionAsync({
      ...shared,
      loan: loan0,
      lot: root,
      childLot: child,
      qty: 25,
      photoHash: await photo("season"),
      note: "9 of 10 came up",
    })
  );
  const lot = (await withRetry(() => fetchLot(client.rpc, child, READ))).data;
  check(
    "return writes the lineage",
    isSome(lot.parent) && lot.parent.value === root && lot.generation === 1
  );
  check(
    "the grower is on record",
    lot.contributor === robin.address && lot.variety === "Smoke bean"
  );
  check(
    "loan is closed out",
    (await withRetry(() => fetchLoan(client.rpc, loan0, READ))).data.status ===
      LoanStatus.Returned
  );

  await refusedWith(6008, "double return refused", async () =>
    send(
      client,
      await getReturnLotInstructionAsync({
        ...shared,
        loan: loan0,
        lot: root,
        childLot: await lotPda(library, childId + 1n),
        qty: 1,
        photoHash: await photo("again"),
        note: "",
      })
    )
  );

  await send(
    client,
    await getBorrowInstructionAsync({
      ...shared,
      lot: child,
      loan: await loanPda(member, 1),
      qty: 5,
    })
  );
  check("borrow reopens after the return", true);

  const spent = startBalance - (await balance(client, robin.address));
  console.log(
    `measure: member spent ${spent} lamports on join + 2 borrows + return (rent + fees)`
  );

  // A wallet with nothing in it, the first thing a stranger hits.
  const empty = await fundedKeypair(funder, 0);
  try {
    await send(
      clientFor(empty),
      await getJoinInstructionAsync({ wallet: empty, payer: empty, library })
    );
    check("empty wallet can't join", false, "the transaction succeeded");
  } catch (err) {
    const failure = describeFailure(err);
    check(
      "empty wallet gets a funding message",
      failure.kind === "funds",
      failure.message
    );
  }

  console.log(`\nprogram refused what it should, library ${library}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
