import assert from "node:assert/strict";
import test from "node:test";
import {mkdtemp, rm, writeFile} from "node:fs/promises";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {fal} from "@fal-ai/client";
import {runFalQueue, uploadFile, downloadFile} from "../src/providers/fal-queue.js";
import {ProviderFailure} from "../src/providers/types.js";

test("result retrieval errors retain classification and the existing request ID", async () => {
  const original = {...fal.queue};
  let cancelled = 0;
  fal.queue.status = async () => ({status: "COMPLETED", request_id: "saved", response_url: "", status_url: "", cancel_url: "", logs: []});
  fal.queue.result = async () => { throw new Error("result retrieval timed out"); };
  fal.queue.cancel = async () => { cancelled += 1; };
  try {
    await assert.rejects(runFalQueue({endpoint: "mock", payload: {}, existingRequestId: "saved", timeoutMs: 100, onSubmitted: async () => { throw new Error("must not resubmit"); }}), (error) => error instanceof ProviderFailure && error.kind === "timeout" && error.requestId === "saved");
    assert.equal(cancelled, 1);
  } finally { Object.assign(fal.queue, original); }
});

test("status timeout with failed cancellation preserves the ID for reconciliation", async () => {
  const original = {...fal.queue};
  fal.queue.status = async () => new Promise(() => {});
  fal.queue.cancel = async () => { throw new Error("cancellation unavailable"); };
  try {
    await assert.rejects(runFalQueue({endpoint: "mock", payload: {}, existingRequestId: "saved", timeoutMs: 10, onSubmitted: async () => {}}), (error) => error instanceof ProviderFailure && error.kind === "timeout" && error.requestId === "saved");
  } finally { Object.assign(fal.queue, original); }
});

test("submission timeout does not invent a request ID or invoke the submitted hook", async () => {
  const original = fal.queue.submit;
  let submitted = false;
  fal.queue.submit = async () => new Promise(() => {});
  try {
    await assert.rejects(runFalQueue({endpoint: "mock", payload: {}, timeoutMs: 10, onSubmitted: async () => { submitted = true; }}), (error) => error instanceof ProviderFailure && error.kind === "timeout" && error.requestId === null);
    assert.equal(submitted, false);
  } finally { fal.queue.submit = original; }
});

test("upload and download have bounded waits and downloads retain request IDs", async () => {
  const dir = await mkdtemp(join(tmpdir(), "milestone-transfer-"));
  const originalUpload = fal.storage.upload;
  const originalFetch = globalThis.fetch;
  fal.storage.upload = async () => new Promise(() => {});
  globalThis.fetch = async (_url, options) => new Promise((_resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("mock fetch did not abort")), 100);
    options!.signal!.addEventListener("abort", () => { clearTimeout(timer); reject(options!.signal!.reason); });
  });
  try {
    const source = join(dir, "source.png");
    await writeFile(source, "fixture");
    await assert.rejects(uploadFile(source, 10), /upload timed out/);
    await assert.rejects(downloadFile("https://example.invalid/fixture", join(dir, "out.mp4"), "saved", 10), (error) => error instanceof ProviderFailure && error.kind === "download_error" && error.requestId === "saved");
  } finally { fal.storage.upload = originalUpload; globalThis.fetch = originalFetch; await rm(dir, {recursive: true, force: true}); }
});
