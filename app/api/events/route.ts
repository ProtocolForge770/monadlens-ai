import { NextResponse } from "next/server";
import { scanRecentBlocks, getLatestBlockNumber } from "@/lib/monad";
import { enrichAddresses, nansenConfigured } from "@/lib/nansen";
import type { OnchainEvent } from "@/lib/types";

// In-memory dedupe cache so repeated polls don't resend the same events.
const seen = new Map<string, number>(); // txHash -> firstSeenMs
const SEEN_TTL_MS = 10 * 60 * 1000;

function pruneSeen() {
  const now = Date.now();
  seen.forEach((v, k) => {
    if (now - v > SEEN_TTL_MS) seen.delete(k);
  });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const blocks = Math.min(
      Math.max(Number(searchParams.get("blocks") || process.env.SCAN_BLOCKS || "5"), 1),
      10
    );

    const [events, latestBlock] = await Promise.all([
      scanRecentBlocks(blocks),
      getLatestBlockNumber(),
    ]);

    pruneSeen();
    const fresh: OnchainEvent[] = [];
    for (const e of events) {
      if (!seen.has(e.id)) {
        seen.set(e.id, Date.now());
        fresh.push(e);
      }
    }

    // Best-effort Nansen enrichment (silent no-op without a key)
    if (nansenConfigured() && fresh.length > 0) {
      const addrs = fresh.flatMap((e) => [e.from, e.to].filter(Boolean) as string[]);
      const labels = await enrichAddresses(addrs);
      for (const e of fresh) {
        e.labels = {
          [e.from]: labels[e.from] ?? null,
          ...(e.to ? { [e.to]: labels[e.to] ?? null } : {}),
        };
      }
    }

    return NextResponse.json({
      ok: true,
      latestBlock,
      scannedBlocks: blocks,
      whaleThresholdMon: Number(process.env.WHALE_THRESHOLD_MON || "10"),
      nansen: nansenConfigured(),
      events: fresh,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
