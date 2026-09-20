"use client";

import { useState } from "react";
import type { OnchainEvent, ExplainResponse } from "@/lib/types";
import { shortAddr, timeAgo, EXPLORER } from "./ui";

export default function EventCard({ event }: { event: OnchainEvent }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExplainResponse | null>(null);

  const isWhale = event.type === "whale";

  async function explain() {
    if (open) {
      setOpen(false);
      return;
    }
    setOpen(true);
    if (result) return;
    setLoading(true);
    try {
      const res = await fetch("/api/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      });
      const data: ExplainResponse = await res.json();
      setResult(data);
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : "Request failed",
      });
    } finally {
      setLoading(false);
    }
  }

  function copyThread() {
    if (!result?.thread) return;
    const text = result.thread
      .map((t, i) => `${i + 1}/ ${t}`)
      .join("\n\n");
    navigator.clipboard.writeText(text).catch(() => {});
  }

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              isWhale ? "bg-amber-400/15 text-amber-300" : "bg-monad/20 text-[#b9a8ff]"
            }`}
          >
            {isWhale ? "🐋 WHALE MOVE" : "🚀 NEW LAUNCH"}
          </span>
          <span className="text-xs text-gray-500 mono">blk {event.blockNumber}</span>
        </div>
        <span className="text-xs text-gray-500 shrink-0">{timeAgo(event.timestamp)}</span>
      </div>

      <div className="mt-3">
        {isWhale ? (
          <div className="text-2xl font-extrabold text-amber-300">
            {event.valueMon} <span className="text-base font-semibold text-amber-200/70">MON</span>
          </div>
        ) : (
          <div className="text-lg font-bold text-[#b9a8ff]">New contract deployed</div>
        )}
      </div>

      <div className="mt-2 text-sm mono text-gray-400 break-all">
        <div>
          <span className="text-gray-600">from&nbsp;</span>
          <a
            className="hover:text-monad underline decoration-dotted"
            href={`/address?addr=${event.from}`}
          >
            {shortAddr(event.from)}
          </a>
          {event.labels?.[event.from] && (
            <span className="ml-2 text-xs bg-emerald-400/15 text-emerald-300 px-2 py-0.5 rounded-full">
              {event.labels[event.from]}
            </span>
          )}
        </div>
        <div>
          <span className="text-gray-600">to&nbsp;&nbsp;&nbsp;</span>
          {event.to ? (
            <>
              <a
                className="hover:text-monad underline decoration-dotted"
                href={`/address?addr=${event.to}`}
              >
                {shortAddr(event.to)}
              </a>
              {event.labels?.[event.to] && (
                <span className="ml-2 text-xs bg-emerald-400/15 text-emerald-300 px-2 py-0.5 rounded-full">
                  {event.labels[event.to]}
                </span>
              )}
            </>
          ) : (
            <span className="text-gray-500 italic">(new contract)</span>
          )}
        </div>
        <div className="mt-1">
          <span className="text-gray-600">tx&nbsp;&nbsp;&nbsp;</span>
          <a
            className="hover:text-monad underline decoration-dotted"
            href={`${EXPLORER}/tx/${event.txHash}`}
            target="_blank"
            rel="noreferrer"
          >
            {shortAddr(event.txHash)} ↗
          </a>
        </div>
      </div>

      <button
        onClick={explain}
        className="mt-3 w-full rounded-xl bg-monad/90 hover:bg-monad text-white font-semibold py-2 text-sm transition"
      >
        {open ? "Hide AI analysis ▲" : "✨ Explain with AI"}
      </button>

      {open && (
        <div className="mt-3 rounded-xl bg-black/30 p-4 border border-[#23233a]">
          {loading && (
            <p className="text-sm text-gray-400 animate-pulse">
              Asking the AI to read this transaction…
            </p>
          )}
          {result && !result.ok && (
            <div className="text-sm">
              <p className="text-amber-300 font-semibold">⚠️ AI unavailable</p>
              <p className="text-gray-400 mt-1">{result.error}</p>
              <p className="text-gray-500 mt-2 text-xs">
                Add <span className="mono">KIMI_API_KEY</span> or{" "}
                <span className="mono">QWEN_API_KEY</span> to{" "}
                <span className="mono">.env</span> and restart to enable.
              </p>
            </div>
          )}
          {result?.ok && (
            <div>
              <p className="text-xs text-gray-500 mb-1">
                via {result.provider} · {result.model}
              </p>
              <p className="text-sm leading-relaxed">{result.explanation}</p>
              {result.thread && result.thread.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-[#b9a8ff]">📝 Draft X thread</p>
                    <button
                      onClick={copyThread}
                      className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full"
                    >
                      Copy thread
                    </button>
                  </div>
                  <div className="space-y-2">
                    {result.thread.map((t, i) => (
                      <div key={i} className="text-sm bg-white/5 rounded-lg p-3">
                        <span className="text-monad font-bold mr-2">{i + 1}/</span>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
