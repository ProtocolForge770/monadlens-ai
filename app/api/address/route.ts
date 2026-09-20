import { NextResponse } from "next/server";
import { getBalance, getTransactionCount, scanAddressActivity } from "@/lib/monad";

const ADDR_RE = /^0x[0-9a-fA-F]{40}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address") || "";

  if (!ADDR_RE.test(address)) {
    return NextResponse.json(
      { ok: false, error: "Invalid address. Expected 0x + 40 hex chars." },
      { status: 400 }
    );
  }

  try {
    const [balance, txCount, activity] = await Promise.all([
      getBalance(address),
      getTransactionCount(address),
      scanAddressActivity(address, 10, 25),
    ]);
    return NextResponse.json({
      ok: true,
      address,
      balanceMon: balance,
      transactionCount: txCount,
      recentActivity: activity,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 502 }
    );
  }
}
