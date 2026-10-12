import {fal} from "@fal-ai/client";
import {basename} from "node:path";
import {readFile, writeFile, rename, rm} from "node:fs/promises";
import type {FailureKind} from "../domain/types.js";
import {ProviderFailure} from "./types.js";

interface QueueStatus { status: "IN_QUEUE" | "IN_PROGRESS" | "COMPLETED"; }
interface DynamicQueue {
  submit(endpoint: string, options: {input: unknown}): Promise<{request_id: string}>;
  status(endpoint: string, options: {requestId: string; logs?: boolean}): Promise<QueueStatus>;
  result(endpoint: string, options: {requestId: string}): Promise<{data: Record<string, unknown>; requestId: string}>;
  cancel(endpoint: string, options: {requestId: string}): Promise<void>;
}
const queue = fal.queue as unknown as DynamicQueue;

async function within<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(new Error(`${label} timed out.`)), timeoutMs); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function failureKind(error: unknown): FailureKind {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  if (/safety|moderation|content policy|blocked/.test(message)) return "safety_rejected";
  if (/timeout|timed out|abort/.test(message)) return "timeout";
  if (/download|http \d{3}/.test(message)) return "download_error";
  return "provider_error";
}

export async function runFalQueue(input: {
  endpoint: string;
  payload: unknown;
  existingRequestId?: string;
  timeoutMs: number;
  pollIntervalMs?: number;
  onSubmitted(requestId: string): Promise<void>;
}): Promise<{data: Record<string, unknown>; requestId: string}> {
  let requestId = input.existingRequestId;
  try {
    if (!requestId) {
      const submitted = await within(queue.submit(input.endpoint, {input: input.payload}), Math.min(input.timeoutMs, 60_000), "Provider submission");
      requestId = submitted.request_id;
      await input.onSubmitted(requestId);
    }
    const deadline = Date.now() + input.timeoutMs;
    for (;;) {
      const remaining = Math.max(1, deadline - Date.now());
      const status = await within(queue.status(input.endpoint, {requestId, logs: true}), Math.min(remaining, 30_000), "Provider status check");
      if (status.status === "COMPLETED") return await within(queue.result(input.endpoint, {requestId}), Math.min(remaining, 60_000), "Provider result retrieval");
      if (Date.now() >= deadline) {
        try {
          await within(queue.cancel(input.endpoint, {requestId}), 30_000, "Provider cancellation");
        } catch {
          throw new ProviderFailure("Provider deadline expired and cancellation could not be confirmed.", "timeout", requestId);
        }
        throw new ProviderFailure("Provider deadline expired; request cancellation was submitted.", "timeout", requestId);
      }
      await new Promise((resolve) => setTimeout(resolve, input.pollIntervalMs ?? 2000));
    }
  } catch (error) {
    if (error instanceof ProviderFailure) throw error;
    const kind = failureKind(error);
    if (kind === "timeout" && requestId) {
      try { await within(queue.cancel(input.endpoint, {requestId}), 30_000, "Provider cancellation"); } catch { /* Preserve the original timeout classification. */ }
    }
    throw new ProviderFailure(error instanceof Error ? error.message : String(error), kind, requestId ?? null);
  }
}

export async function uploadFile(path: string, timeoutMs = 60_000): Promise<string> {
  const bytes = new Uint8Array(await readFile(path));
  return within(fal.storage.upload(new File([bytes], basename(path))), timeoutMs, "Reference upload");
}

export async function downloadFile(url: string, outputPath: string, requestId: string | null = null, timeoutMs = 120_000): Promise<void> {
  try {
    const response = await fetch(url, {signal: AbortSignal.timeout(timeoutMs)});
    if (!response.ok) throw new Error(`Media download failed with HTTP ${response.status}.`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const temporary = `${outputPath}.download`;
    try {
      await writeFile(temporary, bytes);
      await rename(temporary, outputPath);
    } finally { await rm(temporary, {force: true}); }
  } catch (error) {
    throw new ProviderFailure(error instanceof Error ? error.message : String(error), "download_error", requestId);
  }
}
