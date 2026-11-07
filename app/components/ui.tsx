import type { ComponentProps, ReactNode } from "react";
import type { Failure } from "../lib/errors";

const BUTTON_BASE =
  "inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function PrimaryButton({
  className = "",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}
    />
  );
}

export function SecondaryButton({
  className = "",
  ...props
}: ComponentProps<"button">) {
  return (
    <button
      {...props}
      className={`${BUTTON_BASE} border border-border bg-card text-foreground hover:bg-cream ${className}`}
    />
  );
}

export const INPUT_CLASS =
  "min-h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm placeholder:text-muted";

export function TxLink({
  href,
  children = "See it on Solana Explorer",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="underline underline-offset-2"
    >
      {children}
    </a>
  );
}

const FAILURE_TITLES: Record<Failure["kind"], string> = {
  refused: "Refused by the Solana program",
  cancelled: "Cancelled",
  funds: "Your wallet needs devnet SOL",
  network: "Can't reach Solana right now",
  expired: "That took too long",
  unknown: "That didn't work",
};

/**
 * A failure screen: what happened, why, and what to do next. A program refusal
 * is clay, not red: the rule is working, and nobody did anything wrong.
 */
export function FailureNotice({
  failure,
  action,
  onDismiss,
}: {
  failure: Failure;
  action?: ReactNode;
  onDismiss?: () => void;
}) {
  const quiet = failure.kind === "cancelled";
  const tone =
    failure.kind === "refused"
      ? "border-clay bg-clay-soft"
      : quiet
        ? "border-border bg-cream"
        : "border-destructive/60 bg-card";
  return (
    <div
      role={quiet ? "status" : "alert"}
      className={`rounded-lg border p-4 text-sm ${tone}`}
    >
      <p className="font-semibold">{FAILURE_TITLES[failure.kind]}</p>
      <p className="mt-1">{failure.message}</p>
      {failure.kind === "refused" && failure.code !== undefined && (
        <p className="mt-1 text-xs text-muted">
          Nothing changed. Program error {failure.code}.
        </p>
      )}
      {(action || onDismiss) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {action}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="min-h-10 cursor-pointer px-2 text-sm text-muted underline underline-offset-2"
            >
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
}
