// The whole demo path through the real UI, in Chromium, against the real devnet
// program, with a real Wallet Standard wallet injected into the page. It also
// injects the failures AGENT.md asks for: wallet rejection, RPC down, empty wallet.
//
//   npm run e2e                 (needs the Solana CLI wallet with devnet SOL)
//   E2E_SHOTS=/some/dir npm run e2e   also saves screenshots there
//
// A machine, so this does NOT count toward M11 (unassisted strangers).
// Each run creates its own library and costs about 0.03 SOL.

import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  generateKeyPair,
  getAddressFromPublicKey,
  getBase64Encoder,
  getTransactionDecoder,
  getTransactionEncoder,
  signTransaction,
} from "@solana/kit";
import { chromium, type BrowserContext, type Page } from "playwright-core";
import {
  getAddLotInstruction,
  getInitLibraryInstructionAsync,
} from "../app/generated/seed_library";
import { libraryPda, lotPda } from "../app/lib/seed-library";
import {
  clientFor,
  fundedKeypair,
  loadWallet,
  photo,
  send,
} from "../scripts/devnet/client";

const PORT = 3111;
const URL = `http://localhost:${PORT}`;
const SHOTS = process.env.E2E_SHOTS;
const WAIT = { timeout: 90_000 };

let failures = 0;
let activePage: Page | undefined;
function check(name: string, ok: boolean, detail = "") {
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  (${detail})` : ""}`
  );
  if (!ok) failures++;
}

async function shot(page: Page, name: string) {
  if (SHOTS)
    await page.screenshot({ path: join(SHOTS, `${name}.png`), fullPage: true });
}

function findChromium() {
  if (process.env.E2E_CHROMIUM) return process.env.E2E_CHROMIUM;
  const root = join(homedir(), ".cache", "ms-playwright");
  const dirs = existsSync(root)
    ? readdirSync(root)
        .filter((d) => /^chromium-\d+$/.test(d))
        .sort()
        .reverse()
    : [];
  for (const dir of dirs) {
    for (const sub of ["chrome-linux64", "chrome-linux"]) {
      const path = join(root, dir, sub, "chrome");
      if (existsSync(path)) return path;
    }
  }
  throw new Error("No Chromium found. Run: npx playwright install chromium");
}

/** A test wallet: the page sees Wallet Standard, the key stays in this process. */
async function addWallet(context: BrowserContext) {
  const keyPair = await generateKeyPair();
  const address = await getAddressFromPublicKey(keyPair.publicKey);
  const publicKey = Array.from(
    new Uint8Array(await crypto.subtle.exportKey("raw", keyPair.publicKey))
  );
  const state = { signatures: 0, rejectNext: false };

  await context.exposeFunction("__e2eSign", async (wire: number[]) => {
    if (state.rejectNext) {
      state.rejectNext = false;
      throw new Error("User rejected the request.");
    }
    state.signatures++;
    const tx = getTransactionDecoder().decode(new Uint8Array(wire));
    const signed = await signTransaction([keyPair], tx as never);
    return Array.from(getTransactionEncoder().encode(signed as never));
  });

  await context.addInitScript(
    ([walletAddress, key]) => {
      const account = {
        address: walletAddress,
        publicKey: new Uint8Array(key as number[]),
        chains: ["solana:devnet"],
        features: ["solana:signTransaction"],
      };
      const wallet = {
        version: "1.0.0",
        name: "E2E Test Wallet",
        icon: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=",
        chains: ["solana:devnet"],
        accounts: [account],
        features: {
          "standard:connect": {
            version: "1.0.0",
            connect: async () => ({ accounts: [account] }),
          },
          "standard:disconnect": {
            version: "1.0.0",
            disconnect: async () => {},
          },
          "standard:events": { version: "1.0.0", on: () => () => {} },
          "solana:signTransaction": {
            version: "1.0.0",
            supportedTransactionVersions: ["legacy", 0],
            signTransaction: async (...inputs: { transaction: Uint8Array }[]) =>
              Promise.all(
                inputs.map(async ({ transaction }) => ({
                  signedTransaction: new Uint8Array(
                    await (
                      window as unknown as {
                        __e2eSign: (w: number[]) => Promise<number[]>;
                      }
                    ).__e2eSign(Array.from(transaction))
                  ),
                }))
              ),
          },
        },
      };
      window.addEventListener("wallet-standard:app-ready", ((
        event: CustomEvent
      ) => event.detail.register(wallet)) as EventListener);
      window.dispatchEvent(
        new CustomEvent("wallet-standard:register-wallet", {
          detail: (api: { register: (w: unknown) => void }) =>
            api.register(wallet),
        })
      );
    },
    [address, publicKey] as const
  );
  return { address, state };
}

async function connect(page: Page) {
  await page.getByRole("button", { name: "Connect wallet" }).click();
  await page.getByRole("button", { name: "E2E Test Wallet" }).click();
  await page.getByRole("heading", { name: "Your library card" }).waitFor(WAIT);
}

async function main() {
  const funder = clientFor(await loadWallet());

  // A library of its own, so test runs never touch the demo library.
  const steward = await fundedKeypair(funder, 0.01);
  const stewardClient = clientFor(steward);
  const library = await libraryPda(steward.address);
  await send(
    stewardClient,
    await getInitLibraryInstructionAsync({
      steward,
      library,
      name: "E2E Seed Tin",
    })
  );
  await send(
    stewardClient,
    getAddLotInstruction({
      steward,
      library,
      lot: await lotPda(library, 0n),
      variety: "Test Bean",
      qty: 40,
      note: "Starter seed",
      photoHash: await photo("e2e-root"),
    })
  );
  console.log(`library ${library}, steward ${steward.address}`);

  const server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    env: { ...process.env, NEXT_PUBLIC_EXPOFI_STEWARD: steward.address },
    stdio: "ignore",
    detached: true,
  });
  const stop = () => {
    try {
      process.kill(-server.pid!);
    } catch {
      /* already gone */
    }
  };
  process.on("exit", stop);

  const browser = await chromium.launch({
    executablePath: findChromium(),
    headless: true,
  });

  try {
    for (let i = 0; ; i++) {
      try {
        if ((await fetch(URL)).ok) break;
      } catch {
        /* still starting */
      }
      if (i > 90) throw new Error("next dev did not start");
      await new Promise((done) => setTimeout(done, 1000));
    }

    // ---------- 1. Empty wallet: what a stranger hits first ----------
    {
      const context = await browser.newContext();
      await addWallet(context);
      const page = await context.newPage();
      await page.goto(URL);
      await page.getByRole("heading", { name: "E2E Seed Tin" }).waitFor(WAIT);
      await shot(page, "01-landing-disconnected");
      check(
        "disconnected: borrow is held back with a reason",
        await page.getByText("Connect a wallet to borrow.").isVisible()
      );
      await connect(page);
      await page
        .getByRole("button", { name: "Get free devnet SOL" })
        .waitFor(WAIT);
      check("empty wallet: offered free devnet SOL", true);
      await page.getByRole("button", { name: "Join the library" }).click();
      await page.getByText("Your wallet needs devnet SOL").waitFor(WAIT);
      check("empty wallet: join explains funding, not a raw error", true);
      await shot(page, "02-empty-wallet");
      await page.getByRole("button", { name: "Get free devnet SOL" }).click();
      await page
        .getByText("1 devnet SOL received.")
        .or(page.getByText("The automatic faucet is busy."))
        .waitFor(WAIT);
      check(
        "faucet: answers either way",
        true,
        (await page.getByText("The automatic faucet is busy.").isVisible())
          ? "rate-limited, showed the web faucet"
          : "airdrop landed"
      );
      await context.close();
    }

    // ---------- 2. The demo path ----------
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const wallet = await addWallet(context);
    await send(
      funder,
      (await import("@solana-program/system")).getTransferSolInstruction({
        source: funder.payer,
        destination: wallet.address,
        amount: 20_000_000n as never,
      })
    );
    const page = await context.newPage();
    activePage = page;
    const consoleErrors: string[] = [];
    let rateLimited = 0;
    let injected = 0;
    page.on("console", (message) => {
      if (message.type() !== "error") return;
      // The browser logs every 429 from the public RPC. Counted, not a defect (K30).
      if (message.text().includes("429")) rateLimited++;
      else consoleErrors.push(message.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    // performance.now, not Date: the WSL clock jumps (K32).
    const started = performance.now();
    await page.goto(URL);
    await page.getByRole("heading", { name: "E2E Seed Tin" }).waitFor(WAIT);
    await connect(page);

    // Chaos: wallet rejects.
    wallet.state.rejectNext = true;
    await page.getByRole("button", { name: "Join the library" }).click();
    await page.getByText("You cancelled in your wallet").waitFor(WAIT);
    check(
      "wallet rejection: calm message, nothing sent",
      wallet.state.signatures === 0
    );
    await page.getByRole("button", { name: "Dismiss" }).click();

    await page.getByRole("button", { name: "Join the library" }).click();
    await page
      .getByText("You're a member with no open loan")
      .or(page.getByText("You’re a member with no open loan"))
      .waitFor(WAIT);
    check("join: member card appears", wallet.state.signatures === 1);
    await shot(page, "03-member");

    const lot0 = page.getByTestId("lot-0");
    await lot0.getByRole("button", { name: "Borrow" }).click();
    await page
      .getByRole("heading", { name: /Return your saved Test Bean/ })
      .waitFor(WAIT);
    check("borrow: return form appears", wallet.state.signatures === 2);
    await lot0.getByText("30 seeds in the tin").waitFor(WAIT);
    check("borrow: the tin went from 40 to 30", true);
    await shot(page, "04-borrowed");

    // The gate: the program refuses, before the wallet is asked to sign.
    // Chaos: the RPC rate-limits this very step (K30), which must not hide the refusal.
    await page.route(/api\.devnet\.solana\.com/, (route) =>
      injected < 2 && ++injected
        ? route.fulfill({ status: 429, body: "Too Many Requests" })
        : route.fallback()
    );
    const before = wallet.state.signatures;
    await lot0.getByRole("button", { name: "Borrow" }).click();
    await lot0.getByText("Refused by the Solana program").waitFor(WAIT);
    await page.unroute(/api\.devnet\.solana\.com/);
    check(
      "429 during the blocked borrow: retried, refusal still shown",
      injected === 2
    );
    const refusal = await lot0.getByRole("alert").innerText();
    check(
      "blocked borrow: refused in plain words",
      /open loan/i.test(refusal),
      refusal.replace(/\n/g, " / ")
    );
    check(
      "blocked borrow: no signature asked",
      wallet.state.signatures === before
    );
    await shot(page, "05-blocked");

    // Return: photo rule and byte limit, in the form.
    await page.getByLabel("How did it grow?").fill("青菜".repeat(14));
    check(
      "note: counts bytes, not characters (K21)",
      await page.getByText(/84 of 80 bytes/).isVisible()
    );
    check(
      "note too long: return is disabled",
      await page.getByRole("button", { name: "Return seed" }).isDisabled()
    );
    await page.getByLabel("How did it grow?").fill("9 of 10 came up");
    await page.getByRole("button", { name: "Return seed" }).click();
    await page.getByText("Returned seed needs a photo.").waitFor(WAIT);
    check(
      "no photo: inline error, nothing signed",
      wallet.state.signatures === before
    );

    await page.getByLabel("How many seeds did you save?").fill("25");
    await page.getByLabel("A photo of the seed").setInputFiles({
      name: "seed.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        getBase64Encoder().encode(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
        )
      ),
    });
    await page.getByRole("button", { name: "Return seed" }).click();
    await page.getByText("Your seed is back in the library.").waitFor(WAIT);
    check("return: confirmed", wallet.state.signatures === before + 1);

    const child = page.getByTestId("lot-1");
    await child.waitFor(WAIT);
    check(
      "return: a child lot appears",
      /Generation 1/.test(await child.innerText())
    );
    await child.getByRole("button", { name: "Family tree" }).click();
    const tree = await child
      .getByRole("list", { name: /Ancestry/ })
      .innerText();
    check(
      "lineage: child, then parent, with the grower's note",
      /Generation 1/.test(tree) &&
        /Root lot/.test(tree) &&
        /9 of 10 came up/.test(tree)
    );
    await page
      .getByTestId("step-lineage")
      .and(page.locator('[data-done="true"]'))
      .waitFor(WAIT);
    const steps = await page
      .locator('[data-testid^="step-"][data-done="true"]')
      .count();
    check("try-it checklist complete", steps === 5, `${steps}/5`);
    console.log(
      `measure: ${rateLimited - injected} real 429s from the public RPC, ${injected} injected`
    );
    console.log(
      `measure: demo path took ${Math.round((performance.now() - started) / 1000)} s, ${wallet.state.signatures} signatures`
    );
    await page.evaluate(() => document.fonts.ready);
    const fonts = await page.evaluate(() => ({
      heading: getComputedStyle(document.querySelector("h1")!).fontFamily,
      body: getComputedStyle(document.body).fontFamily,
    }));
    check(
      "fonts: the brand's fonts apply (K34)",
      /Fraunces/.test(fonts.heading) && /Inter/.test(fonts.body),
      `${fonts.heading.split(",")[0]} / ${fonts.body.split(",")[0]}`
    );
    await shot(page, "06-lineage");

    // The gate reopened.
    await child.getByRole("button", { name: "Borrow" }).click();
    await page
      .getByRole("heading", { name: /Return your saved Test Bean/ })
      .waitFor(WAIT);
    check("borrow reopens after return", true);

    check(
      "no console errors on the happy path",
      consoleErrors.length === 0,
      consoleErrors.slice(0, 3).join(" | ").slice(0, 400)
    );

    // Chaos: the RPC goes away and comes back.
    await page.route(/solana\.com/, (route) => route.abort());
    await page.addInitScript(() => {
      const w = window as unknown as { __sawNotMember?: boolean };
      setInterval(() => {
        if (document.body?.innerText.includes("aren’t a member"))
          w.__sawNotMember = true;
      }, 50);
    });
    await page.reload();
    await page.getByRole("button", { name: "Try again" }).waitFor(WAIT);
    check(
      "RPC down: failure screen with a retry",
      await page.getByText("Can't reach Solana right now").isVisible()
    );
    await shot(page, "07-rpc-down");
    await page.unroute(/solana\.com/);
    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByRole("heading", { name: "E2E Seed Tin" }).waitFor(WAIT);
    await page
      .getByRole("heading", { name: /Return your saved Test Bean/ })
      .waitFor(WAIT);
    check("RPC back: recovers without a reload, loan and all", true);
    check(
      "a member is never told they aren't one while loading",
      !(await page.evaluate(
        () => (window as unknown as { __sawNotMember?: boolean }).__sawNotMember
      ))
    );

    // Phone width: no horizontal scroll.
    await page.setViewportSize({ width: 375, height: 800 });
    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    check("375 px: no horizontal scroll", overflow <= 0, `${overflow}px`);
    await shot(page, "08-phone");
    await context.close();
  } catch (err) {
    if (activePage) {
      await shot(activePage, "failure");
      const text = await activePage.locator("main").innerText();
      console.error(`page at failure:\n${text.slice(0, 2000)}`);
    }
    throw err;
  } finally {
    await browser.close();
    stop();
  }

  console.log(failures ? `\n${failures} FAILED` : "\nall passed");
  process.exit(failures ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
