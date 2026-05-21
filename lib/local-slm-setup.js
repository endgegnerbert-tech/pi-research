import { createWriteStream, existsSync, mkdirSync, readFileSync, renameSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { get } from "node:https";

export const DEFAULT_LOCAL_SLM = {
  repo: "microsoft/bitnet-b1.58-2B-4T-gguf",
  file: "ggml-model-i2_s.gguf",
};

export function localSlmCacheRoot(env = process.env) {
  return env.PI_RESEARCH_CACHE_DIR || env.XDG_CACHE_HOME && join(env.XDG_CACHE_HOME, "pi-research") || join(homedir(), ".cache", "pi-research");
}

export function localSlmConfigPath(env = process.env) {
  return env.PI_RESEARCH_CONFIG_PATH || join(homedir(), ".config", "pi-research", "local-slm.json");
}

export function defaultLocalSlmModelPath(env = process.env) {
  return join(localSlmCacheRoot(env), "models", DEFAULT_LOCAL_SLM.repo, DEFAULT_LOCAL_SLM.file);
}

export function readLocalSlmConfig(env = process.env) {
  const path = localSlmConfigPath(env);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}

export function writeLocalSlmConfig(config, env = process.env) {
  const path = localSlmConfigPath(env);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(config, null, 2)}\n`);
  return path;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: options.stdio || "pipe", encoding: "utf8", cwd: options.cwd });
  if (result.status !== 0) return { ok: false, error: result.stderr || result.stdout || `${command} failed` };
  return { ok: true, stdout: result.stdout };
}

export function findLlamaCli(env = process.env) {
  if (env.PI_RESEARCH_LLAMA_CLI && existsSync(env.PI_RESEARCH_LLAMA_CLI)) return env.PI_RESEARCH_LLAMA_CLI;
  const result = spawnSync("sh", ["-lc", "command -v llama-cli || command -v llama"], { encoding: "utf8" });
  const command = result.stdout?.trim().split("\n")[0];
  return command || null;
}

function findPython311() {
  const result = spawnSync("sh", ["-lc", "command -v python3.11"], { encoding: "utf8" });
  return result.stdout?.trim() || null;
}

function ensureBrewFormula(name) {
  const hasCommand = spawnSync("sh", ["-lc", `command -v ${name}`], { encoding: "utf8" }).stdout?.trim();
  if (hasCommand) return { ok: true };
  const brew = spawnSync("sh", ["-lc", "command -v brew"], { encoding: "utf8" }).stdout?.trim();
  if (!brew) return { ok: false, error: `Homebrew not found. Install ${name} manually.` };
  const installed = spawnSync("brew", ["install", name], { stdio: "inherit" });
  return installed.status === 0 ? { ok: true } : { ok: false, error: `brew install ${name} failed` };
}

function modelUrl(repo = DEFAULT_LOCAL_SLM.repo, file = DEFAULT_LOCAL_SLM.file) {
  return `https://huggingface.co/${repo}/resolve/main/${file}?download=true`;
}

function request(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = get(url, { headers: { "user-agent": "pi-research-local-slm-setup" } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
        res.resume();
        resolve(request(new URL(res.headers.location, url).toString(), redirects + 1));
        return;
      }
      if (res.statusCode < 200 || res.statusCode >= 300) {
        res.resume();
        reject(new Error(`download failed: HTTP ${res.statusCode}`));
        return;
      }
      resolve(res);
    });
    req.on("error", reject);
  });
}

export async function downloadLocalSlmModel({ destination = defaultLocalSlmModelPath(), force = false, onProgress } = {}) {
  if (!force && existsSync(destination) && statSync(destination).size > 1024 * 1024) {
    return { path: destination, skipped: true, bytes: statSync(destination).size };
  }

  mkdirSync(dirname(destination), { recursive: true });
  const tmp = `${destination}.tmp`;
  rmSync(tmp, { force: true });

  const res = await request(modelUrl());
  const total = Number(res.headers["content-length"] || 0);
  let done = 0;
  await new Promise((resolve, reject) => {
    const out = createWriteStream(tmp);
    res.on("data", (chunk) => {
      done += chunk.length;
      onProgress?.({ done, total });
    });
    res.on("error", reject);
    out.on("error", reject);
    out.on("finish", resolve);
    res.pipe(out);
  });
  renameSync(tmp, destination);
  return { path: destination, skipped: false, bytes: done };
}

function patchBitNetAppleClang(runnerDir) {
  const source = join(runnerDir, "src", "ggml-bitnet-mad.cpp");
  if (!existsSync(source)) return;
  const text = readFileSync(source, "utf8");
  const patched = text.replace("int8_t * y_col = y + col * by;", "const int8_t * y_col = y + col * by;");
  if (patched !== text) writeFileSync(source, patched);
}

function ensureBitNetModelLayout(modelPath, env) {
  const modelDir = join(localSlmCacheRoot(env), "models", "BitNet-b1.58-2B-4T");
  const layoutPath = join(modelDir, DEFAULT_LOCAL_SLM.file);
  mkdirSync(modelDir, { recursive: true });
  if (!existsSync(layoutPath)) {
    try {
      symlinkSync(modelPath, layoutPath);
    } catch {
      writeFileSync(layoutPath, readFileSync(modelPath));
    }
  }
  return { modelDir, modelPath: layoutPath };
}

function ensureBitNetRunner({ installRunner, env }) {
  const runnerDir = join(localSlmCacheRoot(env), "runners", "BitNet");
  if (!existsSync(runnerDir)) {
    mkdirSync(dirname(runnerDir), { recursive: true });
    const clone = run("git", ["clone", "--recursive", "https://github.com/microsoft/BitNet.git", runnerDir], { stdio: "inherit" });
    if (!clone.ok) return clone;
  }

  if (installRunner && process.platform === "darwin") {
    const py = findPython311() ? { ok: true } : ensureBrewFormula("python@3.11");
    if (!py.ok) return py;
    const cmake = ensureBrewFormula("cmake");
    if (!cmake.ok) return cmake;
  }

  const python311 = findPython311();
  if (!python311) return { ok: false, error: "python3.11 not found. Install Python 3.11 for BitNet runner setup." };

  const venvPython = join(runnerDir, ".venv", "bin", "python");
  if (!existsSync(venvPython)) {
    const venv = run(python311, ["-m", "venv", ".venv"], { cwd: runnerDir });
    if (!venv.ok) return venv;
    const pip = run(venvPython, ["-m", "pip", "install", "--upgrade", "pip"], { cwd: runnerDir });
    if (!pip.ok) return pip;
    const reqs = run(venvPython, ["-m", "pip", "install", "-r", "requirements.txt"], { cwd: runnerDir, stdio: "inherit" });
    if (!reqs.ok) return reqs;
  }

  patchBitNetAppleClang(runnerDir);
  return { ok: true, runnerDir, python: venvPython };
}

export async function setupLocalSlm({ installRunner = true, force = false, env = process.env, onProgress } = {}) {
  const model = await downloadLocalSlmModel({ destination: defaultLocalSlmModelPath(env), force, onProgress });
  const layout = ensureBitNetModelLayout(model.path, env);
  const runner = ensureBitNetRunner({ installRunner, env });
  if (!runner.ok) return runner;

  const setup = run(runner.python, ["setup_env.py", "-md", layout.modelDir, "-q", "i2_s"], { cwd: runner.runnerDir, stdio: "inherit" });
  if (!setup.ok) return setup;

  const config = {
    enabled: true,
    runner: "bitnet",
    python: runner.python,
    runnerDir: runner.runnerDir,
    modelPath: layout.modelPath,
    repo: DEFAULT_LOCAL_SLM.repo,
    file: DEFAULT_LOCAL_SLM.file,
    timeoutMs: 120000,
    maxTokens: 128,
    updatedAt: new Date().toISOString(),
  };
  const configPath = writeLocalSlmConfig(config, env);
  return { ok: true, configPath, config, model };
}

export function localSlmDoctor(env = process.env) {
  const config = readLocalSlmConfig(env);
  const command = config?.runner === "bitnet" ? config?.python : env.PI_RESEARCH_LLAMA_CLI || config?.command || findLlamaCli(env) || null;
  const modelPath = env.PI_RESEARCH_GGUF_MODEL || env.PI_RESEARCH_LOCAL_MODEL || config?.modelPath || defaultLocalSlmModelPath(env);
  return {
    configPath: localSlmConfigPath(env),
    configured: Boolean(config?.enabled),
    runner: config?.runner || "llama-cli",
    command,
    commandFound: Boolean(command && existsSync(command)),
    runnerDir: config?.runnerDir,
    runnerFound: config?.runner === "bitnet" ? Boolean(config.runnerDir && existsSync(config.runnerDir)) : undefined,
    modelPath,
    modelFound: existsSync(modelPath),
  };
}
