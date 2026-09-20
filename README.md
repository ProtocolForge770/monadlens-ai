# 🔭 MonadLens AI

**Live whale-move & new-launch radar for Monad testnet — explained by AI, drafted as X threads.**

Built for the **Monad Metropolis Hackathon** (build phase Sep 1 – Oct 14, 2026).

- **Main track:** Track 4 — *Trust, Identity & AI Infrastructure*
  - An AI agent layer that turns raw Monad chain data into human-readable intelligence: whale detection, contract-launch radar, plain-language explanations, and auto-drafted X threads.
- **Target sponsor bounties:**
  - 🛰️ **Nansen** — "Best use of Nansen": optional `NANSEN_API_KEY` enriches feed addresses with Nansen labels / smart-money tags (see `lib/nansen.ts`).
  - 🧠 **KIMI (Moonshot AI)** — "Best Builds Powered by KIMI": primary LLM provider for the Explain feature (`KIMI_API_KEY`).
  - 🤖 **Qwen (Alibaba Cloud)** — "Best Builds with Qwen 3.8 Max": fallback/second LLM provider, agentic explanation + thread drafting (`QWEN_API_KEY`).

**100% read-only demo** — no wallet connect, no signing, no spending. Runs entirely on free public resources.

---

## How it works

1. **Live feed** (`/`): the Next.js API polls Monad testnet's free public RPC, scans the latest blocks, and flags:
   - 🐋 **Whale moves** — native transfers ≥ `WHALE_THRESHOLD_MON` (default 1000 MON)
   - 🚀 **New launches** — contract deployments
2. **AI Explain** (✨ button on every event): sends the event to KIMI (fallback: Qwen) via OpenAI-compatible `/chat/completions`, returns a plain-language explanation + a 3–5 tweet X thread draft you can copy.
3. **Address lookup** (`/address?addr=0x…`): balance, tx count, and recent activity for any Monad address, with per-event AI explanations.
4. **Nansen hook** (`lib/nansen.ts`): when `NANSEN_API_KEY` is set, addresses in the feed get label/smart-money badges. Unset → silently skipped.

---

## Run it

```bash
npm install
cp .env.example .env   # then add your keys (see below)
npm run dev            # → http://localhost:3000
```

### Env setup

| Var | Required | What |
|---|---|---|
| `MONAD_TESTNET_RPC` | No (default works) | Monad testnet RPC — verified: `https://testnet-rpc.monad.xyz` (chain id 10143) |
| `WHALE_THRESHOLD_MON` | No | Whale flag threshold (default `1000`) |
| `KIMI_API_KEY` | Recommended | Moonshot AI key → https://platform.moonshot.ai |
| `QWEN_API_KEY` | Recommended | Alibaba Bailian key (OpenAI-compatible mode) |
| `LLM_PROVIDER` | No | `kimi` (default) or `qwen` — the other is tried as fallback |
| `NANSEN_API_KEY` | Optional | Nansen API key for address labels |

Without any LLM key the app still works — the Explain button shows a friendly "add a key" message instead of failing.

---

## Deploy (Vercel)

1. Push this repo to GitHub (must be public and readable by `metropolis@hackathon.monad.xyz` per hackathon rules).
2. Import into Vercel → add the env vars from `.env.example` in Project Settings.
3. Deploy. No build config needed (standard Next.js).

Testnet deployments: this project is a read-only indexer — nothing needs deploying onchain. If you add contracts later, deploy to Monad testnet (chain id 10143) with the free faucet.

---

## Demo script (≤ 3 min)

1. **0:00–0:20** — Open the app. "MonadLens AI watches Monad testnet live — every whale move and new contract launch, in real time." (show the LIVE badge + latest block)
2. **0:20–1:00** — Wait for / point at a 🐋 whale move. Show from → to, value, tx link to the testnet explorer.
3. **1:00–1:50** — Hit **✨ Explain with AI**. Read the plain-language explanation. Show the auto-drafted X thread + Copy button. ("This is where KIMI/Qwen does the work.")
4. **1:50–2:30** — Point at a 🚀 new launch event. Paste an address into the lookup bar → show balance, tx count, recent activity.
5. **2:30–3:00** — "Nansen labels attach automatically when the key is set. Everything is read-only — no wallet needed. Next: real-time alerts and multi-signal scoring."

---

## Project structure

```
app/
  page.tsx              # live feed (polls /api/events)
  address/page.tsx      # address inspector
  api/
    events/route.ts     # block scanning + whale/launch detection + Nansen enrich
    explain/route.ts    # LLM explain + X thread drafting
    address/route.ts    # address stats + recent activity
lib/
  monad.ts              # raw JSON-RPC client (read-only)
  llm.ts                # OpenAI-compatible KIMI/QWEN layer
  nansen.ts             # optional Nansen label enrichment
  types.ts
components/
  EventCard.tsx         # event card + explain panel
```

## Status / TODO before submission

- [x] Working live feed on Monad testnet RPC
- [x] AI Explain with KIMI + Qwen fallback
- [x] Address lookup
- [x] Nansen hook (key-gated)
- [ ] Real Nansen endpoint mapping (needs the actual Nansen API/MCP access for Monad)
- [ ] Polish: empty-state UX, mobile tweaks, logo/graphic (≤3 MB) for submission
- [ ] Demo video (≤3 min) + pitch video (≤2 min)
- [ ] Create team + project on the Metropolis portal, select Track 4 + bounties
