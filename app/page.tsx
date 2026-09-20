"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import EventCard from "@/components/EventCard";
import type { OnchainEvent } from "@/lib/types";

const POLL_MS = 10_000;

export default function Home() {
  const [events, setEvents] = useState<OnchainEvent[]>([]);
  const [latestBlock, setLatestBlock] = useState<number | null>(null);
  const [nansenOn, setNansenOn] = useState(false);
  const [whaleThreshold, setWhaleThreshold] = useState(10);
  const [status, setStatus] = useState<"live" | "error" | "loading">("loading");
  const [error, setError] = useState<string | null>(null);
  const [addr, setAddr] = useState("");
  const seenRef = useRef<Set<string>>(new Set());

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      if (!data.ok) throw new Error(data.error || "feed error");
      setLatestBlock(data.latestBlock);
      setNansenOn(Boolean(data.nansen));
      if (data.whaleThresholdMon) setWhaleThreshold(data.whaleThresholdMon);
      const fresh: OnchainEvent[] = (data.events as OnchainEvent[]).filter(
        (e) => !seenRef.current.has(e.id)
      );
      fresh.forEach((e) => seenRef.current.add(e.id));
      if (fresh.length > 0) {
        setEvents((prev) => [...fresh, ...prev].slice(0, 100));
      }
      setStatus("live");
      setError(null);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  return (
    <main className="min-h-screen">
      <header className="border-b border-[#23233a] sticky top-0 bg-[#0b0b14]/90 backdrop-blur z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold">
              🔭 <span className="text-monad">MonadLens</span> AI
            </h1>
            <p className="text-xs text-gray-500">
              Live whale moves &amp; new launches on Monad testnet — explained by AI
            </p>
          </div>
          <div className="text-right text-xs">
            <div className="flex items-center gap-2 justify-end">
              <span
                className={`w-2 h-2 rounded-full ${
                  status === "live" ? "bg-emerald-400 pulse-dot" : status === "loading" ? "bg-amber-400 pulse-dot" : "bg-red-400"
                }`}
              />
              <span className="text-gray-400">
                {status === "live" ? "LIVE" : status === "loading" ? "CONNECTING" : "ERROR"}
              </span>
            </div>
            {latestBlock !== null && (
              <div className="text-gray-500 mono mt-1">block {latestBlock.toLocaleString()}</div>
            )}
            {nansenOn && (
              <div className="text-emerald-300 mt-1">✓ Nansen labels on</div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Address lookup */}
        <form
          className="card p-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (/^0x[0-9a-fA-F]{40}$/.test(addr.trim())) {
              window.location.href = `/address?addr=${addr.trim()}`;
            }
          }}
        >
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="🔎 Look up any Monad address (0x…)"
            className="flex-1 bg-black/40 border border-[#23233a] rounded-xl px-4 py-2 text-sm mono outline-none focus:border-monad"
          />
          <button
            type="submit"
            className="bg-monad/90 hover:bg-monad text-white text-sm font-semibold px-5 rounded-xl transition"
          >
            Inspect
          </button>
        </form>

        {error && (
          <div className="card p-4 text-sm text-red-300">
            ⚠️ Feed error: {error} — retrying…
          </div>
        )}

        {/* Feed */}
        <div className="space-y-4">
          {events.length === 0 && status !== "error" && (
            <div className="card p-8 text-center text-gray-500 text-sm">
              <p className="animate-pulse">Scanning latest Monad testnet blocks…</p>
              <p className="mt-2 text-xs">
                Whale moves (≥{whaleThreshold} MON) and new
                contract launches appear here in real time.
              </p>
            </div>
          )}
          {events.map((e) => (
            <EventCard key={e.id} event={e} />
          ))}
        </div>

        <footer className="text-center text-xs text-gray-600 pb-8">
          MonadLens AI · Monad Metropolis hackathon · Track 4: Trust, Identity &amp; AI Infrastructure
          <br />
          Read-only demo — no wallet needed. RPC: testnet-rpc.monad.xyz
        </footer>
      </div>
    </main>
  );
}
