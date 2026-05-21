import { spawn as nodeSpawn } from "node:child_process";

let spawnProcess = nodeSpawn;
let runnerForTests = null;

function firstEnv(env, names) {
  for (const name of names) {
    if (env[name]) return env[name];
  }
  return null;
}

export function getLocalSlmConfig(env = process.env) {
  const modelPath = firstEnv(env, ["PI_RESEARCH_LOCAL_MODEL", "PI_RESEARCH_GGUF_MODEL", "BITNET_GGUF_MODEL", "LLAMA_MODEL"]);
  const enabledFlag = env.PI_RESEARCH_LOCAL_SLM === "1" || env.PI_RESEARCH_LOCAL_SLM === "true";
  return {
    enabled: Boolean(modelPath) && enabledFlag,
    command: firstEnv(env, ["PI_RESEARCH_LLAMA_CLI", "BITNET_LLAMA_CLI", "LLAMA_CLI"]) || "llama-cli",
    modelPath,
    timeoutMs: Number(env.PI_RESEARCH_LOCAL_SLM_TIMEOUT_MS || 12000),
    maxTokens: Number(env.PI_RESEARCH_LOCAL_SLM_MAX_TOKENS || 256),
  };
}

export function parseLocalJson(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : trimmed;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start === -1 || end <= start) return null;
    try {
      return JSON.parse(candidate.slice(start, end + 1));
    } catch {
      return null;
    }
  }
}

function buildLlamaArgs(config, prompt) {
  return [
    "-m", config.modelPath,
    "-p", prompt,
    "-n", String(config.maxTokens),
    "--temp", "0",
    "--no-display-prompt",
  ];
}

async function completeWithLlamaCli(prompt, signal, config) {
  if (!config.enabled) return null;

  return await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const child = spawnProcess(config.command, buildLlamaArgs(config, prompt), { stdio: ["ignore", "pipe", "pipe"] });

    const finish = (value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", abort);
      resolve(value);
    };

    const abort = () => {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
      finish(null);
    };

    const timer = setTimeout(abort, config.timeoutMs);
    timer.unref?.();

    child.stdout?.on("data", (chunk) => { stdout += String(chunk || ""); });
    child.stderr?.on("data", (chunk) => { stderr += String(chunk || ""); });
    child.on("error", () => finish(null));
    child.on("close", (code) => {
      if (code !== 0) return finish(null);
      finish(parseLocalJson(stdout) || parseLocalJson(stderr));
    });

    if (signal?.aborted) abort();
    else signal?.addEventListener?.("abort", abort, { once: true });
  });
}

function queryPlanPrompt(query, mode, limit) {
  return [
    "You are a local web-research query planner.",
    "Return JSON only, no markdown, no explanation.",
    'Schema: {"intent":"definition|comparison|temporal|best_practice|comparative|academic|code|general","queries":["..."]}',
    `Create at most ${limit} search-engine queries for mode ${mode}.`,
    "Queries must be concise, searchable, and include official/docs/source/paper qualifiers when useful.",
    "Do not answer the question. Only plan searches.",
    `Question: ${query}`,
  ].join("\n");
}

function domainPrompt(query) {
  return [
    "You are a local web-research router.",
    "Return JSON only, no markdown, no explanation.",
    'Schema: {"domain":"web|github|security|papers|specs|changelog|forums|package-registry|vendor-status"}',
    "Choose the single best domain for retrieval policy and source ranking.",
    `Question: ${query}`,
  ].join("\n");
}

function normalizePlan(value, limit) {
  if (!value || !Array.isArray(value.queries)) return null;
  const queries = value.queries
    .map((item) => String(item || "").trim())
    .filter(Boolean);
  if (!queries.length) return null;
  return {
    intent: typeof value.intent === "string" ? value.intent : "general",
    queries: [...new Set(queries)].slice(0, limit),
  };
}

const DOMAIN_VALUES = new Set(["web", "github", "security", "papers", "specs", "changelog", "forums", "package-registry", "vendor-status"]);

function normalizeDomain(value) {
  const domain = String(value?.domain || "").trim().toLowerCase();
  return DOMAIN_VALUES.has(domain) ? domain : null;
}

async function completeLocalJsonTask(task) {
  return runnerForTests
    ? await runnerForTests(task)
    : await completeWithLlamaCli(task.prompt, task.signal, getLocalSlmConfig());
}

export async function planQueriesWithLocalSlm(query, mode, limit, signal) {
  const raw = await completeLocalJsonTask({ task: "query_plan", prompt: queryPlanPrompt(query, mode, limit), query, mode, limit, signal });
  return normalizePlan(raw, limit);
}

export async function classifyDomainWithLocalSlm(query, signal) {
  const raw = await completeLocalJsonTask({ task: "domain", prompt: domainPrompt(query), query, signal });
  return normalizeDomain(raw);
}

export function setLocalSlmRunnerForTests(runner) {
  runnerForTests = runner || null;
}

export function setLocalSlmSpawnForTests(factory) {
  spawnProcess = factory || nodeSpawn;
}
