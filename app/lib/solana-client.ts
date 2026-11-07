import { createEmptyClient } from "@solana/kit";
import { rpc, rpcAirdrop } from "@solana/kit-plugin-rpc";

export type ClusterMoniker = "devnet" | "testnet" | "mainnet" | "localnet";

export const CLUSTERS: ClusterMoniker[] = [
  "devnet",
  "testnet",
  "mainnet",
  "localnet",
];

const CLUSTER_URLS: Record<ClusterMoniker, string> = {
  devnet: "https://api.devnet.solana.com",
  testnet: "https://api.testnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
  localnet: "http://localhost:8899",
};

const WS_URLS: Record<ClusterMoniker, string> = {
  devnet: "wss://api.devnet.solana.com",
  testnet: "wss://api.testnet.solana.com",
  mainnet: "wss://api.mainnet-beta.solana.com",
  localnet: "ws://localhost:8900",
};

// The public devnet RPC rate-limits hard (K30). Point a deployment at its own
// endpoint with NEXT_PUBLIC_EXPOFI_RPC_URL.
const RPC_OVERRIDE = process.env.NEXT_PUBLIC_EXPOFI_RPC_URL;

export function getClusterUrl(cluster: ClusterMoniker) {
  return RPC_OVERRIDE ?? CLUSTER_URLS[cluster];
}

export function getClusterWsConfig(cluster: ClusterMoniker) {
  if (RPC_OVERRIDE) return { url: RPC_OVERRIDE.replace(/^http/, "ws") };
  return cluster === "localnet" ? { url: WS_URLS[cluster] } : undefined;
}

export function createSolanaClient(cluster: ClusterMoniker) {
  const url = getClusterUrl(cluster);
  const wsUrl = RPC_OVERRIDE
    ? RPC_OVERRIDE.replace(/^http/, "ws")
    : WS_URLS[cluster];
  return createEmptyClient()
    .use(rpc(url, { url: wsUrl }))
    .use(rpcAirdrop());
}

export type SolanaClient = ReturnType<typeof createSolanaClient>;
