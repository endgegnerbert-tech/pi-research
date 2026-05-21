import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  classifyDomainWithLocalSlm,
  getLocalSlmConfig,
  parseLocalJson,
  planQueriesWithLocalSlm,
  setLocalSlmRunnerForTests,
  setLocalSlmSpawnForTests,
} from "../lib/local-slm.js";

test("getLocalSlmConfig enables llama.cpp only when explicitly configured", () => {
  const root = mkdtempSync(join(tmpdir(), "pi-research-slm-"));
  const modelPath = join(root, "bitnet.gguf");
  writeFileSync(modelPath, "model");

  try {
    assert.equal(getLocalSlmConfig({}).enabled, false);
    assert.equal(getLocalSlmConfig({ PI_RESEARCH_GGUF_MODEL: modelPath }).enabled, false);

    const config = getLocalSlmConfig({
      PI_RESEARCH_LOCAL_SLM: "1",
      PI_RESEARCH_GGUF_MODEL: modelPath,
      PI_RESEARCH_LLAMA_CLI: "/usr/local/bin/llama-cli",
      PI_RESEARCH_LOCAL_SLM_TIMEOUT_MS: "5000",
    });

    assert.equal(config.enabled, true);
    assert.equal(config.modelPath, modelPath);
    assert.equal(config.command, "/usr/local/bin/llama-cli");
    assert.equal(config.timeoutMs, 5000);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("parseLocalJson extracts JSON from llama.cpp style output", () => {
  const parsed = parseLocalJson("prompt echo\n```json\n{\"queries\":[\"official docs\"]}\n```\n");
  assert.deepEqual(parsed, { queries: ["official docs"] });
});

test("planQueriesWithLocalSlm normalizes runner JSON", async () => {
  setLocalSlmRunnerForTests(async ({ query, mode, limit }) => ({
    intent: mode === "code" ? "code" : "general",
    queries: [`${query} official docs`, `${query} GitHub README`, `${query} official docs`].slice(0, limit + 1),
  }));

  try {
    const plan = await planQueriesWithLocalSlm("duckdb node", "code", 2, undefined);
    assert.deepEqual(plan, {
      intent: "code",
      queries: ["duckdb node official docs", "duckdb node GitHub README"],
    });
  } finally {
    setLocalSlmRunnerForTests(null);
  }
});

test("classifyDomainWithLocalSlm accepts only known domains", async () => {
  setLocalSlmRunnerForTests(async ({ task }) => (task === "domain" ? { domain: "github" } : null));

  try {
    assert.equal(await classifyDomainWithLocalSlm("open issue in repo", undefined), "github");
  } finally {
    setLocalSlmRunnerForTests(null);
  }

  setLocalSlmRunnerForTests(async () => ({ domain: "unknown" }));
  try {
    assert.equal(await classifyDomainWithLocalSlm("anything", undefined), null);
  } finally {
    setLocalSlmRunnerForTests(null);
  }
});

test("planQueriesWithLocalSlm can invoke llama.cpp CLI", async () => {
  const previousEnabled = process.env.PI_RESEARCH_LOCAL_SLM;
  const previousModel = process.env.PI_RESEARCH_GGUF_MODEL;
  const previousCli = process.env.PI_RESEARCH_LLAMA_CLI;
  const previousConfigPath = process.env.PI_RESEARCH_CONFIG_PATH;
  let captured;

  const root = mkdtempSync(join(tmpdir(), "pi-research-slm-"));
  const modelPath = join(root, "bitnet.gguf");
  writeFileSync(modelPath, "model");

  process.env.PI_RESEARCH_LOCAL_SLM = "1";
  process.env.PI_RESEARCH_GGUF_MODEL = modelPath;
  process.env.PI_RESEARCH_LLAMA_CLI = "/bin/llama-cli";
  process.env.PI_RESEARCH_CONFIG_PATH = join(root, "missing-config.json");

  setLocalSlmSpawnForTests((command, args) => {
    captured = { command, args };
    const child = new EventEmitter();
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.kill = () => true;
    queueMicrotask(() => {
      child.stdout.emit("data", '{"queries":["local docs"]}');
      child.emit("close", 0);
    });
    return child;
  });

  try {
    const plan = await planQueriesWithLocalSlm("local model", "fast", 2, undefined);
    assert.equal(captured.command, "/bin/llama-cli");
    assert.ok(captured.args.includes(modelPath));
    assert.deepEqual(plan.queries, ["local docs"]);
  } finally {
    if (previousEnabled === undefined) delete process.env.PI_RESEARCH_LOCAL_SLM;
    else process.env.PI_RESEARCH_LOCAL_SLM = previousEnabled;
    if (previousModel === undefined) delete process.env.PI_RESEARCH_GGUF_MODEL;
    else process.env.PI_RESEARCH_GGUF_MODEL = previousModel;
    if (previousCli === undefined) delete process.env.PI_RESEARCH_LLAMA_CLI;
    else process.env.PI_RESEARCH_LLAMA_CLI = previousCli;
    if (previousConfigPath === undefined) delete process.env.PI_RESEARCH_CONFIG_PATH;
    else process.env.PI_RESEARCH_CONFIG_PATH = previousConfigPath;
    setLocalSlmSpawnForTests(null);
    rmSync(root, { recursive: true, force: true });
  }
});
