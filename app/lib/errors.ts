import {
  isSolanaError,
  SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM,
} from "@solana/kit";
import {
  getSeedLibraryErrorMessage,
  type SeedLibraryError,
} from "../generated/seed_library";

// Every failure answers the same three questions in plain words: what happened,
// why, and what to do next (AGENT.md, Omotenashi).

export type Failure = {
  /** Why it failed, which decides how the screen presents it. */
  kind: "refused" | "cancelled" | "funds" | "network" | "expired" | "unknown";
  message: string;
  /** The on-chain error code, when the program refused. */
  code?: number;
};

// Anchor's ConstraintSeeds: we built from a stale read, so the next account in a
// sequence (a loan, or a lot id) isn't the one we aimed at. Re-read and rebuild
// (K23, K31).
export const STALE_SEEDS = 2006;
// The system program's "account already in use", also from a stale read.
const ACCOUNT_IN_USE = 0;

const STALE_MESSAGE =
  "The library changed while this was on its way. Nothing happened. Try again.";

// Anchor's own error codes that a member can actually hit.
const ANCHOR_MESSAGES: Record<number, string> = {
  3012: "Join the library before borrowing.",
};

// SeedLibraryError codes are 6000 + their position in error.rs.
const FIRST_PROGRAM_ERROR = 6000;
const LAST_PROGRAM_ERROR = 6012;
// The system program's "insufficient lamports", from creating an account.
const SYSTEM_INSUFFICIENT_LAMPORTS = 1;

const FUNDS_MESSAGE =
  "Your wallet needs a little devnet SOL to pay for account rent. Nothing was sent. Get some, then try again.";

function causes(err: unknown): unknown[] {
  const chain: unknown[] = [];
  let current = err;
  while (current) {
    chain.push(current);
    current = current instanceof Error ? current.cause : undefined;
  }
  return chain;
}

export function programErrorCode(err: unknown): number | undefined {
  for (const link of causes(err)) {
    if (
      isSolanaError(link, SOLANA_ERROR__INSTRUCTION_ERROR__CUSTOM) &&
      typeof link.context?.code === "number"
    ) {
      return link.context.code;
    }
  }
  return undefined;
}

export function describeFailure(err: unknown): Failure {
  const code = programErrorCode(err);
  if (code === SYSTEM_INSUFFICIENT_LAMPORTS) {
    return { kind: "funds", code, message: FUNDS_MESSAGE };
  }
  if (code !== undefined) {
    if (code >= FIRST_PROGRAM_ERROR && code <= LAST_PROGRAM_ERROR) {
      return {
        kind: "refused",
        code,
        message: getSeedLibraryErrorMessage(code as SeedLibraryError),
      };
    }
    if (code === STALE_SEEDS || code === ACCOUNT_IN_USE) {
      return { kind: "unknown", code, message: STALE_MESSAGE };
    }
    if (ANCHOR_MESSAGES[code]) {
      return { kind: "refused", code, message: ANCHOR_MESSAGES[code] };
    }
  }

  const text = causes(err)
    .map((link) => (link instanceof Error ? link.message : String(link)))
    .join(" | ");

  if (/reject|cancel|denied|declined/i.test(text)) {
    return {
      kind: "cancelled",
      message: "You cancelled in your wallet. Nothing was sent.",
    };
  }
  if (
    /insufficient (funds|lamports)|debit an account|prior credit|account not found|AccountNotFound/i.test(
      text
    )
  ) {
    return { kind: "funds", message: FUNDS_MESSAGE };
  }
  if (/blockhash|expired|block height/i.test(text)) {
    return {
      kind: "expired",
      message:
        "This took too long and the request expired. Nothing changed. Try again.",
    };
  }
  if (/fetch|network|timed? ?out|429|503|socket|HTTP error/i.test(text)) {
    return {
      kind: "network",
      message:
        "We can't reach Solana devnet right now. Nothing changed. Try again in a moment.",
    };
  }
  const deepest = causes(err).at(-1);
  const message = deepest instanceof Error ? deepest.message : String(deepest);
  return {
    kind: "unknown",
    message: message.length > 200 ? `${message.slice(0, 200)}...` : message,
  };
}

export function parseTransactionError(err: unknown): string {
  return describeFailure(err).message;
}

/**
 * The public devnet RPC answers 429 and drops connections often (K30), and a
 * rate limit isn't worth a failure screen. Retry those, and only those. If a
 * request did land and only its answer was lost, the rebuilt transaction is
 * refused on-chain, so a retry can't do anything twice.
 */
export async function retryNetwork<T>(attempt: () => Promise<T>): Promise<T> {
  for (let tries = 1; ; tries++) {
    try {
      return await attempt();
    } catch (err) {
      if (tries >= 4 || describeFailure(err).kind !== "network") throw err;
      await new Promise((done) => setTimeout(done, 800 * tries));
    }
  }
}
