// Minimal raw JSON-RPC client for Monad testnet (chain id 10143).
// No wallet, no signing — pure read-only calls over the free public RPC.
import type { OnchainEvent } from "./types";

const RPC =
  process.env.MONAD_TESTNET_RPC || "https://testnet-rpc.monad.xyz";

const EXPLORER =
  process.env.MONAD_TESTNET_EXPLORER || "https://testnet.monadexplorer.com";

export function explorerTxUrl(txHash: string): string {
  return `${EXPLORER}/tx/${txHash}`;
}

export function explorerAddressUrl(address: string): string {
  return `${EXPLORER}/address/${address}`;
}

async function rpc<T>(method: string, params: unknown[] = []): Promise<T> {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    // 10s timeout
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`RPC HTTP ${res.status} on ${method}`);
  const json = await res.json();
  if (json.error) throw new Error(`RPC error on ${method}: ${json.error.message}`);
  return json.result as T;
}

export function hexToBigInt(hex: string): bigint {
  return BigInt(hex);
}

export function weiToMon(weiHex: string): string {
  const wei = hexToBigInt(weiHex);
  const mon = Number(wei) / 1e18;
  // keep up to 4 decimals without scientific notation
  return mon.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function monToWei(mon: number): bigint {
  return BigInt(Math.round(mon * 1e18));
}

interface RpcBlock {
  number: string;
  timestamp: string;
  transactions: RpcTx[];
}

interface RpcTx {
  hash: string;
  from: string;
  to: string | null;
  value: string;
}

export async function getLatestBlockNumber(): Promise<number> {
  const hex = await rpc<string>("eth_blockNumber");
  return Number(hexToBigInt(hex));
}

export async function getBlockWithTxs(blockNumber: number): Promise<RpcBlock> {
  const hexNum = "0x" + blockNumber.toString(16);
  return rpc<RpcBlock>("eth_getBlockByNumber", [hexNum, true]);
}

function whaleThresholdWei(): bigint {
  // Default 10 MON: Monad testnet is quiet (typical blocks carry <20 MON transfers),
  // so the demo threshold is relative, not mainnet-scale.
  const thresholdMon = Number(process.env.WHALE_THRESHOLD_MON || "10");
  return monToWei(thresholdMon);
}

/**
 * Scan the last `count` blocks for whale-size native transfers
 * and contract deployments (new launches).
 */
export async function scanRecentBlocks(count = 3): Promise<OnchainEvent[]> {
  const latest = await getLatestBlockNumber();
  const threshold = whaleThresholdWei();
  const blocks = await Promise.all(
    Array.from({ length: count }, (_, i) => getBlockWithTxs(latest - i))
  );

  const events: OnchainEvent[] = [];
  for (const block of blocks) {
    const blockNumber = Number(hexToBigInt(block.number));
    const timestamp = Number(hexToBigInt(block.timestamp));
    for (const tx of block.transactions || []) {
      if (!tx.hash || !tx.from) continue;
      const valueWei = tx.value ? hexToBigInt(tx.value) : 0n;
      if (tx.to === null) {
        // Contract creation -> new launch
        events.push({
          id: tx.hash,
          type: "launch",
          txHash: tx.hash,
          blockNumber,
          timestamp,
          from: tx.from,
          to: null,
          valueMon: weiToMon(tx.value || "0x0"),
        });
      } else if (valueWei >= threshold) {
        events.push({
          id: tx.hash,
          type: "whale",
          txHash: tx.hash,
          blockNumber,
          timestamp,
          from: tx.from,
          to: tx.to,
          valueMon: weiToMon(tx.value),
        });
      }
    }
  }
  // newest first
  events.sort((a, b) => b.blockNumber - a.blockNumber);
  return events;
}

export async function getBalance(address: string): Promise<string> {
  const hex = await rpc<string>("eth_getBalance", [address, "latest"]);
  return weiToMon(hex);
}

export async function getTransactionCount(address: string): Promise<number> {
  const hex = await rpc<string>("eth_getTransactionCount", [address, "latest"]);
  return Number(hexToBigInt(hex));
}

/** Find transactions involving `address` in the last `count` blocks. */
export async function scanAddressActivity(
  address: string,
  count = 10,
  maxResults = 25
): Promise<OnchainEvent[]> {
  const latest = await getLatestBlockNumber();
  const blocks = await Promise.all(
    Array.from({ length: count }, (_, i) => getBlockWithTxs(latest - i))
  );
  const needle = address.toLowerCase();
  const out: OnchainEvent[] = [];
  for (const block of blocks) {
    const blockNumber = Number(hexToBigInt(block.number));
    const timestamp = Number(hexToBigInt(block.timestamp));
    for (const tx of block.transactions || []) {
      if (!tx.hash || !tx.from) continue;
      const from = tx.from.toLowerCase();
      const to = (tx.to || "").toLowerCase();
      if (from === needle || to === needle) {
        out.push({
          id: tx.hash,
          type: tx.to === null ? "launch" : "whale",
          txHash: tx.hash,
          blockNumber,
          timestamp,
          from: tx.from,
          to: tx.to,
          valueMon: weiToMon(tx.value || "0x0"),
        });
        if (out.length >= maxResults) break;
      }
    }
    if (out.length >= maxResults) break;
  }
  out.sort((a, b) => b.blockNumber - a.blockNumber);
  return out;
}
