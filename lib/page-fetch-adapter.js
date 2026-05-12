import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { WEAK_PAGE_POLICY } from "./research-policy.js";

const SCRAPLING_ROOT = fileURLToPath(new URL("../Scrapling", import.meta.url));
const BLOCKED_PATTERNS = [
  /cloudflare/i,
  /turnstile/i,
  /captcha/i,
  /please enable cookies/i,
  /bot detection/i,
  /verify you are human/i,
  /security check/i,
  /access denied/i,
  /temporarily unavailable/i,
  /attention required/i,
  /challenge-platform/i,
];
const DYNAMIC_PATTERNS = [
  /__next_data__/i,
  /__nuxt__/i,
  /data-reactroot/i,
  /hydrat/i,
  /window\.__INITIAL_STATE__/i,
  /id=["']app["']/i,
  /id=["']root["']/i,
];

function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function assessPageAttempt({ status = 200, body = "", contentType = "", url = "" } = {}) {
  const text = String(body || "");
  const plain = stripHtml(text);
  const lower = `${text}\n${url}`.toLowerCase();
  const antiBotSignal = BLOCKED_PATTERNS.some((pattern) => pattern.test(lower));
  const negativeSignals = [];

  if (plain.length < WEAK_PAGE_POLICY.weakTextLimit) negativeSignals.push("weak_text");
  else if (plain.length < WEAK_PAGE_POLICY.thinTextLimit) negativeSignals.push("thin_text");
  if (antiBotSignal) negativeSignals.push("placeholder");
  if (!/text\/(html|plain)/i.test(contentType) && plain.length < 500) negativeSignals.push("unsupported_content_type");

  const blocked = status === 403
    || status === 429
    || (antiBotSignal && plain.length < WEAK_PAGE_POLICY.blockedTextLimit);
  const dynamic = !blocked && (DYNAMIC_PATTERNS.some((pattern) => pattern.test(lower)) || (text.includes("<script") && plain.length < WEAK_PAGE_POLICY.weakTextLimit));
  const weak = blocked || negativeSignals.includes("weak_text") || negativeSignals.length >= WEAK_PAGE_POLICY.minNegativeSignals;

  return {
    blocked,
    dynamic,
    weak,
    mode: blocked ? "stealthy" : dynamic ? "dynamic" : "async",
    plainLength: plain.length,
    negativeSignals,
  };
}

export function chooseScraplingMode(input) {
  return assessPageAttempt(input).mode;
}

function pythonScript() {
  return String.raw`
import asyncio
import json
import os
import sys

root = sys.argv[1]
mode = sys.argv[2]
url = sys.argv[3]
payload = json.loads(sys.argv[4])

sys.path.insert(0, root)

async def main():
    from scrapling.fetchers import AsyncFetcher, DynamicFetcher, StealthyFetcher

    timeout = payload.get("timeout")
    kwargs = {}
    if timeout:
        kwargs["timeout"] = timeout

    if mode == "async":
        response = await AsyncFetcher.get(url, **kwargs)
    elif mode == "dynamic":
        response = DynamicFetcher.fetch(url, **kwargs)
    else:
        response = StealthyFetcher.fetch(url, **kwargs)

    headers = {}
    raw_headers = getattr(response, "headers", None)
    if hasattr(raw_headers, "items"):
        headers = dict(raw_headers.items())
    else:
        try:
            headers = dict(raw_headers or {})
        except Exception:
            headers = {}

    body = getattr(response, "body", None)
    if body is None:
        candidate = getattr(response, "text", None)
        body = candidate() if callable(candidate) else candidate

    if isinstance(body, bytes):
        body = body.decode("utf-8", "replace")
    elif not isinstance(body, str):
        body = str(body or "")

    out = {
        "ok": True,
        "url": getattr(response, "url", url),
        "status": getattr(response, "status", 200),
        "contentType": headers.get("content-type", ""),
        "body": body,
        "headers": headers,
    }
    print(json.dumps(out))

try:
    asyncio.run(main())
except Exception as exc:
    print(json.dumps({"ok": False, "error": str(exc), "type": exc.__class__.__name__}))
    sys.exit(1)
`;
}

export async function fetchWithScrapling(url, mode, signal, config = {}) {
  if (!mode) return null;

  return await new Promise((resolve) => {
    const child = spawn(process.env.PYTHON || "python3", ["-c", pythonScript(), SCRAPLING_ROOT, mode, url, JSON.stringify({ timeout: config.pageTimeoutMs || 30000 })], {
      env: {
        ...process.env,
        PYTHONPATH: [SCRAPLING_ROOT, process.env.PYTHONPATH].filter(Boolean).join(path.delimiter),
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });

    const finish = (value) => {
      if (!signal) return resolve(value);
      if (signal.aborted) return resolve(null);
      return resolve(value);
    };

    child.on("error", () => finish(null));
    child.on("close", (code) => {
      if (code !== 0) return finish(null);
      try {
        const parsed = JSON.parse(stdout.trim() || "{}");
        if (!parsed.ok) return finish(null);
        return finish(parsed);
      } catch {
        if (stderr) return finish(null);
        return finish(null);
      }
    });

    if (signal) {
      const abort = () => {
        child.kill("SIGKILL");
        finish(null);
      };
      if (signal.aborted) abort();
      else signal.addEventListener("abort", abort, { once: true });
    }
  });
}

export const pageFetchAdapter = {
  assessPageAttempt,
  chooseScraplingMode,
  fetchWithScrapling,
};
