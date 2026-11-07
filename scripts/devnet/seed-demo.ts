// Seeds the demo library on devnet: three root lots, and one bean lot grown
// out for three generations so the lineage has something to show.
//
//   npm run demo-seed
//
// Idempotent and resumable: it reads the library and does only what is missing,
// so after a dropped connection (K30) just run it again. Growers are throwaway
// keypairs with no SOL. The steward's wallet pays their rent and fees
// through the `payer` signer (K22), so this also runs sponsorship on real devnet.

import {
  fetchLibrary,
  fetchMaybeLibrary,
  getAddLotInstruction,
  getBorrowInstructionAsync,
  getInitLibraryInstructionAsync,
  getJoinInstructionAsync,
  getReturnLotInstructionAsync,
} from "../../app/generated/seed_library";
import {
  libraryPda,
  loanPda,
  lotPda,
  memberPda,
} from "../../app/lib/seed-library";
import {
  clientFor,
  fundedKeypair,
  loadWallet,
  photo,
  READ,
  send,
  withRetry,
} from "./client";

const NAME = "Demo Seed Tin";

const ROOT_LOTS = [
  {
    variety: "Crimson Flowered Broad Bean",
    qty: 60,
    note: "Starter seed from the steward",
  },
  {
    variety: "Black Cherry Tomato",
    qty: 40,
    note: "Starter seed from the steward",
  },
  {
    variety: "Bronze Arrow Lettuce",
    qty: 80,
    note: "Starter seed from the steward",
  },
];

// Each generation grows from the one before, starting at lot 0.
const SEASONS = [
  {
    borrow: 12,
    returned: 40,
    note: "11 of 12 came up. Strong plants, saved the best pods.",
  },
  {
    borrow: 10,
    returned: 35,
    note: "9 of 10 came up. Blackfly in June, recovered.",
  },
  { borrow: 8, returned: 30, note: "All 8 came up. Earliest crop so far." },
];

const ROOTS = BigInt(ROOT_LOTS.length);
const TOTAL = ROOTS + BigInt(SEASONS.length);

async function main() {
  const steward = await loadWallet();
  const client = clientFor(steward);
  const library = await libraryPda(steward.address);

  const existing = await withRetry(() =>
    fetchMaybeLibrary(client.rpc, library, READ)
  );
  if (!existing.exists) {
    await send(
      client,
      await getInitLibraryInstructionAsync({ steward, library, name: NAME })
    );
    console.log(`created library "${NAME}" ${library}`);
  }

  const lotCount = async () =>
    (await withRetry(() => fetchLibrary(client.rpc, library, READ))).data
      .lotCount;

  for (let id = await lotCount(); id < ROOTS; id++) {
    const { variety, qty, note } = ROOT_LOTS[Number(id)];
    const lot = await lotPda(library, id);
    await send(
      client,
      getAddLotInstruction({
        steward,
        library,
        lot,
        variety,
        qty,
        note,
        photoHash: await photo(`root:${variety}`),
      })
    );
    console.log(`root lot ${id}: ${variety}`);
  }

  // Resume from the newest generation already on-chain. A season that stopped
  // part-way leaves only a throwaway member with an open loan, which harms nothing.
  for (let count = await lotCount(); count < TOTAL; count = await lotCount()) {
    const season = SEASONS[Number(count - ROOTS)];
    const parent = await lotPda(library, count === ROOTS ? 0n : count - 1n);
    const grower = await fundedKeypair(client, 0);
    const member = await memberPda(library, grower.address);
    const shared = { wallet: grower, payer: steward, library };

    await send(client, await getJoinInstructionAsync(shared));
    const loan = await loanPda(member, 0);
    await send(
      client,
      await getBorrowInstructionAsync({
        ...shared,
        lot: parent,
        loan,
        qty: season.borrow,
      })
    );
    await send(
      client,
      await getReturnLotInstructionAsync({
        ...shared,
        loan,
        lot: parent,
        childLot: await lotPda(library, count),
        qty: season.returned,
        photoHash: await photo(`season:${count}`),
        note: season.note,
      })
    );
    console.log(
      `generation ${count - ROOTS + 1n}: lot ${count} grown by ${grower.address}`
    );
  }

  console.log(`library ${library}: ${await lotCount()} lots`);
  console.log(`steward ${steward.address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
