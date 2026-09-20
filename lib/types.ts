// Shared types for MonadLens AI

export type EventType = "whale" | "launch";

export interface OnchainEvent {
  id: string; // tx hash
  type: EventType;
  txHash: string;
  blockNumber: number;
  timestamp: number; // unix seconds
  from: string;
  to: string | null; // null for contract creation
  valueMon: string; // human-readable MON amount
  labels?: Record<string, string | null>; // address -> Nansen label (when available)
}

export interface ExplainRequest {
  event: OnchainEvent;
}

export interface ExplainResponse {
  ok: boolean;
  provider?: string;
  model?: string;
  explanation?: string;
  thread?: string[];
  error?: string;
}
