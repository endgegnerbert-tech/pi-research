import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  defaultLocalSlmModelPath,
  localSlmConfigPath,
  localSlmDoctor,
  readLocalSlmConfig,
  writeLocalSlmConfig,
} from "../lib/local-slm-setup.js";
import { getLocalSlmConfig } from "../lib/local-slm.js";

test("local SLM config is stored outside the package tree", () => {
  const root = mkdtempSync(join(tmpdir(), "pi-research-slm-"));
  const env = {
    PI_RESEARCH_CACHE_DIR: join(root, "cache"),
    PI_RESEARCH_CONFIG_PATH: join(root, "config", "local-slm.json"),
  };

  try {
    const modelPath = defaultLocalSlmModelPath(env);
    writeFileSync(modelPath, "x", { flag: "w" });
  } catch {
    // parent directory intentionally absent in this assertion
  }

  assert.equal(localSlmConfigPath(env), join(root, "config", "local-slm.json"));
  assert.match(defaultLocalSlmModelPath(env), /bitnet-b1\.58-2B-4T-gguf/);
  rmSync(root, { recursive: true, force: true });
});

test("getLocalSlmConfig reads setup config and remains env-overridable", () => {
  const root = mkdtempSync(join(tmpdir(), "pi-research-slm-"));
  const modelPath = join(root, "model.gguf");
  writeFileSync(modelPath, "model");
  const env = { PI_RESEARCH_CONFIG_PATH: join(root, "config.json") };
  writeLocalSlmConfig({ enabled: true, command: "/bin/llama-cli", modelPath }, env);

  try {
    const config = getLocalSlmConfig(env);
    assert.equal(config.enabled, true);
    assert.equal(config.modelPath, modelPath);
    assert.equal(config.command, "/bin/llama-cli");

    assert.equal(getLocalSlmConfig({ ...env, PI_RESEARCH_LOCAL_SLM: "0" }).enabled, false);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("localSlmDoctor reports configured runner and model", () => {
  const root = mkdtempSync(join(tmpdir(), "pi-research-slm-"));
  const modelPath = join(root, "model.gguf");
  writeFileSync(modelPath, "model");
  const env = { PI_RESEARCH_CONFIG_PATH: join(root, "config.json") };
  writeLocalSlmConfig({ enabled: true, command: "/bin/llama-cli", modelPath }, env);

  try {
    assert.deepEqual(readLocalSlmConfig(env).modelPath, modelPath);
    const doctor = localSlmDoctor(env);
    assert.equal(doctor.configured, true);
    assert.equal(doctor.modelFound, true);
    assert.equal(doctor.command, "/bin/llama-cli");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
