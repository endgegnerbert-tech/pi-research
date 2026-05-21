import { spawn } from "node:child_process";
import { join } from "node:path";
import { existsSync } from "node:fs";

let daemonProcess = null;
let isReady = false;
let messageQueue = [];
let pendingRequests = new Map();
let requestIdCounter = 1;

export function resolveTinyRouterConfig(env = process.env) {
  const enabled = env.PI_RESEARCH_TINY_ROUTER === "1" || env.PI_RESEARCH_TINY_ROUTER === "true";
  // Point to the root model dir which contains 'domain' and 'followup' subfolders
  const modelDir = env.PI_RESEARCH_TINY_ROUTER_MODEL || join(process.cwd(), ".cache", "models", "pi-research-router");
  const pythonPath = env.PI_RESEARCH_TINY_ROUTER_PYTHON || join(process.cwd(), ".venv-router", "bin", "python");
  
  return {
    enabled: enabled && existsSync(join(modelDir, "domain")) && existsSync(pythonPath),
    modelDir,
    pythonPath,
    timeoutMs: Number(env.PI_RESEARCH_TINY_ROUTER_TIMEOUT_MS || 500)
  };
}

function startDaemon(config) {
  if (daemonProcess) return;
  
  const daemonScript = join(process.cwd(), "ml", "router", "daemon.py");
  daemonProcess = spawn(config.pythonPath, [daemonScript, config.modelDir], {
    stdio: ["pipe", "pipe", "pipe"]
  });
  
  let buffer = "";
  
  daemonProcess.stdout.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop(); // keep remainder
    
    for (const line of lines) {
      if (line.trim() === "READY") {
        isReady = true;
        for (const msg of messageQueue) {
          msg.startInferenceTimer();
          daemonProcess.stdin.write(msg.payload + "\n");
        }
        messageQueue = [];
        continue;
      }
      
      try {
        const parsed = JSON.parse(line);
        // Daemon currently answers synchronously in order, so we resolve the oldest pending
        const oldestKey = pendingRequests.keys().next().value;
        if (oldestKey) {
          const { resolve } = pendingRequests.get(oldestKey);
          pendingRequests.delete(oldestKey);
          resolve(parsed);
        }
      } catch {
        // ignore malformed JSON
      }
    }
  });
  
  daemonProcess.stderr.on("data", () => {
    // ignore stderr warnings for now
  });
  
  const currentProcess = daemonProcess;
  
  daemonProcess.on("exit", () => {
    if (daemonProcess === currentProcess) {
      daemonProcess = null;
      isReady = false;
      for (const { resolve } of pendingRequests.values()) {
        resolve({ error: "Daemon exited" });
      }
      pendingRequests.clear();
    }
  });
}

export function stopTinyRouterDaemon() {
  if (daemonProcess) {
    daemonProcess.kill();
    daemonProcess = null;
  }
  isReady = false;
  messageQueue = [];
  for (const { resolve } of pendingRequests.values()) {
    resolve({ error: "Daemon stopped manually" });
  }
  pendingRequests.clear();
}

function requestTinyRouter(config, taskPayload, signal, finalize) {
  startDaemon(config);

  const id = requestIdCounter++;
  const payload = JSON.stringify({ id, ...taskPayload });

  return new Promise((resolve) => {
    let settled = false;
    let timer;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", abort);
      pendingRequests.delete(id);
      resolve(finalize(result));
    };

    const abort = () => finish(null);

    pendingRequests.set(id, { resolve: finish });

    const startInferenceTimer = () => {
      timer = setTimeout(abort, config.timeoutMs);
      timer.unref?.();
    };

    if (signal?.aborted) {
      abort();
    } else {
      signal?.addEventListener?.("abort", abort, { once: true });
      if (isReady) {
        startInferenceTimer();
        daemonProcess.stdin.write(payload + "\n");
      } else {
        messageQueue.push({ payload, startInferenceTimer });
      }
    }
  });
}

export async function classifyDomainWithTinyRouter(query, mode = "fast", signal, env = process.env) {
  const config = resolveTinyRouterConfig(env);
  if (!config.enabled) return null;

  return requestTinyRouter(
    config,
    { task: "domain", query, mode },
    signal,
    (result) => (result && !result.error && result.domain && result.confidence >= 0.80 ? result.domain : null),
  );
}

export function classifyFollowupWithStrongRules(query, mode = "fast", conflict = "none", sources = {}) {
  const text = String(query || "").toLowerCase();
  const sourceCount = Number(sources.source_count || 0);
  const hasAuthority = Boolean(sources.has_authority);
  const hasRecent = Boolean(sources.has_recent);
  const isRecencyQuery = /\b(latest|current|today|release|changelog|new)\b/.test(text);

  if (conflict === "severe") return "need_conflict_resolution";
  if (conflict === "minor" && !(mode === "fast" && hasAuthority && sourceCount >= 4)) return "need_conflict_resolution";
  if (isRecencyQuery && !hasRecent) return "need_recency";
  if (!hasAuthority && sourceCount === 0) return "need_more_sources";
  return null;
}

export function applyConflictTinyRouterDecision(heuristicConflictDetected, structuredDecision, options = {}) {
  const allowClear = options.allowClear === true;

  if (structuredDecision === "open_conflict" || structuredDecision === "needs_review") return true;
  if (heuristicConflictDetected && !allowClear) return true;
  if (heuristicConflictDetected && (structuredDecision === "resolved_by_authority" || structuredDecision === "resolved_by_recency" || structuredDecision === "no_conflict")) {
    return false;
  }
  return Boolean(heuristicConflictDetected);
}

export function applySufficiencyTinyRouterDecision(currentSufficient, structuredDecision) {
  if (!currentSufficient) return false;
  if (["need_authority", "need_more_sources", "need_recency", "need_version_context", "need_conflict_resolution"].includes(structuredDecision)) {
    return false;
  }
  return true;
}

export function classifyFollowupHeuristically(query, mode = "fast", conflict = "none", sources = {}) {
  const text = String(query || "").toLowerCase();
  const sourceCount = Number(sources.source_count || 0);
  const hasAuthority = Boolean(sources.has_authority);
  const isAcademicQuery = /\b(paper|papers|arxiv|doi|publisher|survey|review|research)\b/.test(text);

  const strongRule = classifyFollowupWithStrongRules(query, mode, conflict, sources);
  if (strongRule) return strongRule;

  if (mode === "academic" || isAcademicQuery) {
    if (isAcademicQuery) return "need_primary_source";
    if (!hasAuthority) return "need_authority";
    if (sourceCount < 4) return "need_more_sources";
    return "stop";
  }

  if (mode === "deep") {
    if (!hasAuthority) return "need_authority";
    if (sourceCount <= 1) return "need_more_sources";
    if (sourceCount < 3) return "need_more_sources";
    return "stop";
  }

  if (mode === "fast" || mode === "code") {
    if (hasAuthority && sourceCount >= 1) return "stop";
    if (sourceCount >= 3) return "stop";
    return null;
  }

  if (!hasAuthority) return "need_authority";
  if (sourceCount === 0) return "need_more_sources";
  return "stop";
}

export async function classifyFollowupWithTinyRouter(query, mode, conflict, sources, signal, env = process.env) {
  const followupEnabled = env.PI_RESEARCH_TINY_ROUTER_FOLLOWUP === "1" || env.PI_RESEARCH_TINY_ROUTER_FOLLOWUP === "true";
  if (!followupEnabled) return null;

  const strongRule = classifyFollowupWithStrongRules(query, mode, conflict, sources);
  if (strongRule) return strongRule;

  const config = resolveTinyRouterConfig(env);
  if (!config.enabled) return classifyFollowupHeuristically(query, mode, conflict, sources);

  return requestTinyRouter(
    config,
    { task: "followup", query, mode, conflict, sources },
    signal,
    (result) => (result && !result.error && result.action && result.confidence >= 0.75
      ? result.action
      : classifyFollowupHeuristically(query, mode, conflict, sources)),
  );
}
