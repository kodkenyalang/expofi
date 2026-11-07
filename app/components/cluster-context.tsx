"use client";

import { createContext, useContext, useCallback, type ReactNode } from "react";
import type { ClusterMoniker } from "../lib/solana-client";
import { getExplorerUrl } from "../lib/explorer";

type ClusterContextValue = {
  cluster: ClusterMoniker;
  getExplorerUrl: (path: string) => string;
};

const ClusterContext = createContext<ClusterContextValue | null>(null);

// The seed_library program is deployed to devnet only, so there is nothing to
// switch to (AGENT.md: blast-radius, devnet only until after the hackathon).
const CLUSTER: ClusterMoniker = "devnet";

export function ClusterProvider({ children }: { children: ReactNode }) {
  const explorerUrl = useCallback(
    (path: string) => getExplorerUrl(path, CLUSTER),
    []
  );

  return (
    <ClusterContext.Provider
      value={{ cluster: CLUSTER, getExplorerUrl: explorerUrl }}
    >
      {children}
    </ClusterContext.Provider>
  );
}

export function useCluster() {
  const ctx = useContext(ClusterContext);
  if (!ctx) throw new Error("useCluster must be used within ClusterProvider");
  return ctx;
}
