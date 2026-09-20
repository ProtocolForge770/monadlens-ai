// Nansen enrichment hook (optional).
// If NANSEN_API_KEY is set, this module attempts to fetch address labels /
// smart-money tags from the Nansen API and attaches them to events.
// If the key is unset — or the API errors — it returns {} silently and the
// app works exactly the same without labels.
//
// NOTE for the hackathon submission: wire this to the real Nansen endpoint
// you are granted access to (Address Labels / Smart Money API or the Nansen
// MCP tool equivalent). The integration point (called from /api/events) is
// real — only the exact upstream path/token mapping is environment-specific.

const BASE = process.env.NANSEN_API_BASE || "https://api.nansen.ai";

export function nansenConfigured(): boolean {
  return Boolean(process.env.NANSEN_API_KEY);
}

export async function enrichAddresses(
  addresses: string[]
): Promise<Record<string, string | null>> {
  if (!nansenConfigured()) return {};
  const unique = [...new Set(addresses.filter(Boolean))].slice(0, 25);
  if (unique.length === 0) return {};

  try {
    // Best-effort call to the Nansen address-label endpoint.
    // If your Nansen plan exposes a different path, override via NANSEN_API_BASE
    // (e.g. point it at a small proxy that maps to the right Nansen MCP/API call).
    const res = await fetch(`${BASE.replace(/\/$/, "")}/v1/addresses/labels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NANSEN_API_KEY}`,
      },
      body: JSON.stringify({ addresses: unique, chain: "monad" }),
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return {};
    const json = await res.json();
    const out: Record<string, string | null> = {};
    const rows: Array<{ address: string; label?: string; tags?: string[] }> =
      json.labels || json.data || [];
    for (const row of rows) {
      if (!row?.address) continue;
      const label =
        row.label || (row.tags && row.tags.length > 0 ? row.tags.join(", ") : null);
      out[row.address] = label ?? null;
    }
    return out;
  } catch {
    return {};
  }
}
