"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import EventCard from "@/components/EventCard";
import { shortAddr, EXPLORER } from "@/components/ui";
import type { OnchainEvent } from "@/lib/types";

interface AddressData {
  ok: boolean;
  address?: string;
  balanceMon?: string;
  transactionCount?: number;
  recentActivity?: OnchainEvent[];
  error?: string;
}

function AddressView() {
  const params = useSearchParams();
  const addr = params.get("addr") || "";
  const [data, setData] = useState<AddressData | null>(null);

  useEffect(() => {
    if (!addr) return;
    fetch(`/api/address?address=${addr}`)
      .then((r) => r.json())
      .then(setData)
      .catch((e) =>
        setData({ ok: false, error: e instanceof Error ? e.message : String(e) })
      );
  }, [addr]);

  return (
    <main className="min-h-screen">
      <header className="border-b border-[#23233a]">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <a href="/" className="text-xl font-extrabold">
            🔭 <span className="text-monad">MonadLens</span> AI
          </a>
          <a href="/" className="text-sm text-gray-400 hover:text-white">
            ← Live feed
          </a>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="card p-5">
          <p className="text-xs text-gray-500 mb-1">ADDRESS</p>
          <a
            href={`${EXPLORER}/address/${addr}`}
            target="_blank"
            rel="noreferrer"
            className="mono text-sm break-all hover:text-monad underline decoration-dotted"
          >
            {addr} ↗
          </a>
          {!data && <p className="text-sm text-gray-500 mt-4 animate-pulse">Loading onchain data…</p>}
          {data && !data.ok && (
            <p className="text-sm text-red-300 mt-4">⚠️ {data.error}</p>
          )}
          {data?.ok && (
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="bg-black/30 rounded-xl p-4">
                <p className="text-xs text-gray-500">BALANCE</p>
                <p className="text-xl font-extrabold text-emerald-300">
                  {data.balanceMon} <span className="text-sm">MON</span>
                </p>
              </div>
              <div className="bg-black/30 rounded-xl p-4">
                <p className="text-xs text-gray-500">TRANSACTIONS</p>
                <p className="text-xl font-extrabold">{data.transactionCount}</p>
              </div>
            </div>
          )}
        </div>

        {data?.ok && (
          <div>
            <h2 className="text-sm font-bold text-gray-400 mb-3">
              RECENT ACTIVITY ({data.recentActivity?.length ?? 0} txs in last 10 blocks)
            </h2>
            <div className="space-y-4">
              {(data.recentActivity || []).map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
              {(data.recentActivity || []).length === 0 && (
                <div className="card p-6 text-center text-sm text-gray-500">
                  No activity from {shortAddr(addr)} in the last 10 blocks.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function AddressPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading…</div>}>
      <AddressView />
    </Suspense>
  );
}
