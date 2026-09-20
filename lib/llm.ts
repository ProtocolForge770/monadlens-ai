// LLM layer — OpenAI-compatible chat completions.
// Primary: KIMI (Moonshot AI). Fallback: QWEN (Alibaba, OpenAI-compatible mode).
// Keys come from env only. If none is set, callers get a graceful "no key" result.

interface ProviderConfig {
  name: string;
  base: string;
  key: string;
  model: string;
}

function providers(): ProviderConfig[] {
  const list: ProviderConfig[] = [];
  if (process.env.KIMI_API_KEY) {
    list.push({
      name: "kimi",
      base: process.env.KIMI_API_BASE || "https://api.moonshot.ai/v1",
      key: process.env.KIMI_API_KEY,
      model: process.env.KIMI_MODEL || "kimi-k2-0711-preview",
    });
  }
  if (process.env.QWEN_API_KEY) {
    list.push({
      name: "qwen",
      base: process.env.QWEN_API_BASE || "https://dashscope.aliyuncs.com/compatible-mode/v1",
      key: process.env.QWEN_API_KEY,
      model: process.env.QWEN_MODEL || "qwen-plus",
    });
  }
  const preferred = (process.env.LLM_PROVIDER || "kimi").toLowerCase();
  list.sort((a, b) =>
    a.name === preferred ? -1 : b.name === preferred ? 1 : 0
  );
  return list;
}

export async function chatComplete(
  system: string,
  user: string,
  maxTokens = 900
): Promise<{ ok: true; provider: string; model: string; text: string } | { ok: false; error: string }> {
  const cfgs = providers();
  if (cfgs.length === 0) {
    return {
      ok: false,
      error:
        "No LLM API key configured. Set KIMI_API_KEY (Moonshot AI) or QWEN_API_KEY (Alibaba) in your .env to enable AI explanations.",
    };
  }

  let lastError = "";
  for (const cfg of cfgs) {
    try {
      const res = await fetch(`${cfg.base.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cfg.key}`,
        },
        body: JSON.stringify({
          model: cfg.model,
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        const body = await res.text();
        lastError = `${cfg.name}: HTTP ${res.status} — ${body.slice(0, 200)}`;
        continue; // try next provider
      }
      const json = await res.json();
      const text: string | undefined =
        json.choices?.[0]?.message?.content;
      if (!text) {
        lastError = `${cfg.name}: empty response`;
        continue;
      }
      return { ok: true, provider: cfg.name, model: cfg.model, text };
    } catch (e) {
      lastError = `${cfg.name}: ${e instanceof Error ? e.message : String(e)}`;
    }
  }
  return { ok: false, error: `All LLM providers failed. ${lastError}` };
}

export const SYSTEM_PROMPT = `You are MonadLens, an onchain analyst for the Monad blockchain testnet.
Explain onchain events in simple, plain language that a curious newcomer can follow.
Be concise, crypto-native, and honest about what you can and cannot know from a single transaction.
Then draft a 3-5 tweet X thread about the event: a hook tweet, 1-2 detail tweets, a "what to watch" tweet, and a short closing CTA.
Keep each tweet under 240 characters. No emojis spam — max 2 per thread. End the thread with "stay tuned".`;

export function buildExplainPrompt(event: {
  type: string;
  txHash: string;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string | null;
  valueMon: string;
}): string {
  const lines = [
    `Event type: ${event.type === "whale" ? "Large native MON transfer (whale move)" : "New contract deployment (new launch)"}`,
    `Chain: Monad testnet (chain id 10143)`,
    `Tx hash: ${event.txHash}`,
    `Block: ${event.blockNumber}`,
    `Time: ${new Date(event.timestamp * 1000).toISOString()}`,
    `From: ${event.from}`,
    `To: ${event.to ?? "(contract creation — no recipient)"}`,
    `Value: ${event.valueMon} MON`,
  ];
  return `Analyze this onchain event:\n\n${lines.join("\n")}\n\nOutput format:\nEXPLANATION:\n<2-3 sentences in plain language>\n\nTHREAD:\n1/ <tweet>\n2/ <tweet>\n3/ <tweet>\n(optionally 4/ and 5/)`;
}

/** Split the model output into explanation + thread tweets. */
export function parseExplainOutput(text: string): { explanation: string; thread: string[] } {
  const threadIdx = text.indexOf("THREAD:");
  let explanation = text;
  let threadPart = "";
  if (threadIdx >= 0) {
    explanation = text.slice(0, threadIdx).replace(/^EXPLANATION:\s*/i, "").trim();
    threadPart = text.slice(threadIdx + "THREAD:".length).trim();
  }
  const thread = threadPart
    .split(/\n+/)
    .map((l) => l.replace(/^\d+\/\s*/, "").trim())
    .filter((l) => l.length > 0);
  return { explanation, thread };
}
