"use client";

import { LibraryView } from "./components/library-view";
import { ThemeToggle } from "./components/theme-toggle";
import { WalletButton } from "./components/wallet-button";

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
        <span className="font-display text-xl font-semibold tracking-tight">
          ExpoFi
        </span>
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="rounded-full border border-clay/50 px-2.5 py-1 text-xs font-medium text-clay">
            Devnet<span className="hidden sm:inline"> demo</span>
          </span>
          <ThemeToggle />
          <WalletButton />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <section className="py-8 sm:py-12">
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            A seed library that expects offspring.
          </h1>
          <p className="mt-4 max-w-2xl text-base sm:text-lg">
            Borrow a packet in spring. Bring saved seed back in autumn. While a
            loan is open, the Solana program won&rsquo;t let you borrow again,
            and every return joins the variety&rsquo;s family tree for good.
          </p>
        </section>

        <LibraryView />
      </main>
    </div>
  );
}
