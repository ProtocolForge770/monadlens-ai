import { NextResponse } from "next/server";
import { chatComplete, buildExplainPrompt, parseExplainOutput, SYSTEM_PROMPT } from "@/lib/llm";
import type { ExplainRequest, ExplainResponse } from "@/lib/types";

export async function POST(request: Request) {
  let body: ExplainRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json<ExplainResponse>(
      { ok: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { event } = body;
  if (!event || !event.txHash || !event.from) {
    return NextResponse.json<ExplainResponse>(
      { ok: false, error: "Missing event payload" },
      { status: 400 }
    );
  }

  const prompt = buildExplainPrompt(event);
  const result = await chatComplete(SYSTEM_PROMPT, prompt);

  if (!result.ok) {
    // Graceful fallback: no key set or provider failed
    return NextResponse.json<ExplainResponse>({
      ok: false,
      error: result.error,
    });
  }

  const { explanation, thread } = parseExplainOutput(result.text);
  return NextResponse.json<ExplainResponse>({
    ok: true,
    provider: result.provider,
    model: result.model,
    explanation,
    thread,
  });
}
