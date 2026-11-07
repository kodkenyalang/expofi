const STEPS = [
  { id: "join", text: "Join the library" },
  { id: "borrow", text: "Borrow some seed" },
  { id: "blocked", text: "Try to borrow again. The program refuses" },
  { id: "return", text: "Return saved seed with a photo" },
  { id: "lineage", text: "Open the family tree of your new lot" },
] as const;

export type TryItStep = (typeof STEPS)[number]["id"];

/** The demo path, so a stranger can finish it without being told. */
export function TryIt({ done }: { done: Set<TryItStep> }) {
  const next = STEPS.find((step) => !done.has(step.id))?.id;
  return (
    <section
      aria-labelledby="try-it"
      className="rounded-xl border border-border bg-card p-4 sm:p-5"
    >
      <h2 id="try-it" className="font-display text-xl font-semibold">
        Try the whole loop
      </h2>
      <p className="mt-1 text-sm text-muted">
        A real season takes months. Here you can return seed right away.
      </p>
      <ol className="mt-3 space-y-2 text-sm">
        {STEPS.map((step, i) => {
          const isDone = done.has(step.id);
          return (
            <li
              key={step.id}
              data-testid={`step-${step.id}`}
              data-done={isDone}
              className="flex gap-2"
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border text-xs tabular-nums ${isDone ? "border-leaf bg-leaf text-background" : "border-border"}`}
              >
                {isDone ? "✓" : i + 1}
              </span>
              <span
                className={
                  step.id === next
                    ? "font-medium"
                    : isDone
                      ? "text-muted"
                      : undefined
                }
              >
                {step.text}
                {isDone && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          );
        })}
      </ol>
      {!next && (
        <p role="status" className="mt-3 text-sm font-medium text-leaf">
          That&rsquo;s the loop: nobody had to chase anyone, and the family tree
          can&rsquo;t be lost when the coordinator changes.
        </p>
      )}
    </section>
  );
}
