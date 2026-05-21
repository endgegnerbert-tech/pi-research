import { spawn as nodeSpawn } from "node:child_process";
import { existsSync } from "node:fs";

import { readLocalSlmConfig } from "./local-slm-setup.js";

let spawnProcess = nodeSpawn;
let runnerForTests = null;

function firstEnv(env, names) {
  for (const name of names) {
    if (env[name]) return env[name];
  }
  return null;
}

export function getLocalSlmConfig(env = process.env) {
  const shouldReadFileConfig = env === process.env || Boolean(env.PI_RESEARCH_CONFIG_PATH);
  const fileConfig = shouldReadFileConfig && env.PI_RESEARCH_LOCAL_SLM !== "0" && env.PI_RESEARCH_LOCAL_SLM !== "false" ? readLocalSlmConfig(env) : null;
  const modelPath = firstEnv(env, ["PI_RESEARCH_LOCAL_MODEL", "PI_RESEARCH_GGUF_MODEL", "BITNET_GGUF_MODEL", "LLAMA_MODEL"]) || fileConfig?.modelPath || null;
  const command = firstEnv(env, ["PI_RESEARCH_LLAMA_CLI", "BITNET_LLAMA_CLI", "LLAMA_CLI"]) || fileConfig?.command || "llama-cli";
  const enabledFlag = env.PI_RESEARCH_LOCAL_SLM === "1" || env.PI_RESEARCH_LOCAL_SLM === "true" || fileConfig?.enabled === true;
  return {
    enabled: Boolean(modelPath) && enabledFlag && existsSync(modelPath),
    runner: fileConfig?.runner || "llama-cli",
    command,
    python: fileConfig?.python,
    runnerDir: fileConfig?.runnerDir,
    modelPath,
    timeoutMs: Number(env.PI_RESEARCH_LOCAL_SLM_TIMEOUT_MS || fileConfig?.timeoutMs || 12000),
    maxTokens: Number(env.PI_RESEARCH_LOCAL_SLM_MAX_TOKENS || fileConfig?.maxTokens || 256),
  };
}

function extractJsonObjects(text) {
  const out = [];
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;
  const value = String(text || "");

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      if (depth === 0) start = i;
      depth += 1;
    } else if (char === "}" && depth > 0) {
      depth -= 1;
      if (depth === 0 && start !== -1) out.push(value.slice(start, i + 1));
    }
  }
  return out;
}

export function parseLocalJson(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;

  const responseText = trimmed.includes("Response:") ? trimmed.slice(trimmed.indexOf("Response:") + "Response:".length) : trimmed;
  const fences = [...responseText.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  const candidates = [
    ...fences.map((match) => match[1].trim()).reverse(),
    responseText,
    trimmed,
  ];

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate.trim());
    } catch {
      for (const objectText of extractJsonObjects(candidate)) {
        try {
          return JSON.parse(objectText);
        } catch {
          // try next object
        }
      }
    }
  }
  return null;
}

function buildRunnerCommand(config, prompt) {
  if (config.runner === "bitnet") {
    return {
      command: config.python || "python",
      args: [
        "run_inference.py",
        "-m", config.modelPath,
        "-p", prompt,
        "-n", String(config.maxTokens),
        "-temp", "0",
      ],
      cwd: config.runnerDir,
    };
  }

  return {
    command: config.command,
    args: [
      "-m", config.modelPath,
      "-p", prompt,
      "-n", String(config.maxTokens),
      "--temp", "0",
      "--no-display-prompt",
    ],
  };
}

async function completeWithLlamaCli(prompt, signal, config) {
  if (!config.enabled) return null;

  return await new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let settled = false;
    const run = buildRunnerCommand(config, prompt);
    const child = spawnProcess(run.command, run.args, { stdio: ["ignore", "pipe", "pipe"], cwd: run.cwd });

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
    "Return only one minified JSON object. No markdown. No prose.",
    "Required keys: intent string, queries string array.",
    `Create at most ${limit} search-engine queries for mode ${mode}.`,
    "Queries must be concise, searchable, and include official/docs/source/paper qualifiers when useful.",
    "Do not answer the question. Only plan searches.",
    `Question: ${query}`,
  ].join("\n");
}

function domainPrompt(query) {
  return [
    "You are a local web-research router.",
    "Return only one minified JSON object. No markdown. No prose.",
    "Required key: domain string.",
    "Allowed domains: web, github, security, papers, specs, changelog, forums, package-registry, vendor-status.",
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
