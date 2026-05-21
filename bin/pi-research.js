#!/usr/bin/env node

import { setupLocalSlm, localSlmDoctor } from "../lib/local-slm-setup.js";
import { startMcpServer } from "../mcp/server.js";

function hasFlag(name) {
  return process.argv.includes(name);
}

async function main() {
  const command = process.argv[2];

  if (command === "setup-local-slm") {
    let lastPercent = -1;
    const result = await setupLocalSlm({
      installRunner: !hasFlag("--no-install-runner"),
      force: hasFlag("--force"),
      onProgress({ done, total }) {
        if (!total) return;
        const percent = Math.floor((done / total) * 100);
        if (percent !== lastPercent && percent % 5 === 0) {
          lastPercent = percent;
          process.stderr.write(`Downloading BitNet GGUF... ${percent}%\n`);
        }
      },
    });
    if (!result.ok) {
      process.stderr.write(`${result.error}\n`);
      process.exitCode = 1;
      return;
    }
    process.stdout.write(`Local SLM ready.\nConfig: ${result.configPath}\nModel: ${result.config.modelPath}\nRunner: ${result.config.runner}\n`);
    return;
  }

  if (command === "doctor-local-slm") {
    process.stdout.write(`${JSON.stringify(localSlmDoctor(), null, 2)}\n`);
    return;
  }

  startMcpServer();
}

main().catch((error) => {
  process.stderr.write(`${error?.stack || error}\n`);
  process.exitCode = 1;
});
