# pi-research

![pi-research logo](docs/assets/pi-research-logo.png)

[![npm version](https://img.shields.io/npm/v/pi-research?color=blue)](https://www.npmjs.com/package/pi-research)
[![tests](https://img.shields.io/badge/tests-90%2F90-brightgreen)](https://github.com/endgegnerbert-tech/pi-research)
[![Pi package](https://img.shields.io/badge/pi-package-blueviolet)](https://pi.ai)

`pi-research` is a Pi extension for grounded web research.
It searches, ranks, compares, and synthesizes sources inside the agent.

![community packs](docs/assets/pi-research-community.png)

## Why it exists

When agents answer well, they usually do three things:

1. search the right places
2. prefer authoritative sources
3. explain confidence and gaps clearly

`pi-research` does that without an external research service.

## Best practices

- use `fast` for short factual lookups
- use `deep` for comparisons, conflicts, or unclear questions
- use `code` for docs, repos, README-driven answers, and snippets
- use `academic` for paper-heavy topics
- set `options.requireAuthoritative: true` when source quality matters more than recall
- use `options.format: json` when you need machine-readable output
- add `options.files` when local docs matter
- keep questions specific; vague prompts create noisy retrieval

## What it does

- searches the live web
- scores and deduplicates sources
- prefers official docs, READMEs, and papers when relevant
- follows up when the first pass is not enough
- caches repeated research and expensive page fetches
- escalates blocked, JS-heavy, or thin pages through Scrapling when needed
- extracts code blocks for code-focused questions
- supports local files as additional sources
- optionally uses a local BitNet/`bitnet.cpp` JSON planner before heuristic fallback
- returns structured results with citations, confidence, conflicts, and gaps

## Current implementation status

- **Phase 1 — speed and caching:** implemented persistent research cache reuse, faster fast-mode stopping, and longer TTLs for expensive fetched pages.
- **Phase 2 — Scrapling fetch fallback:** implemented a reusable Python daemon, async Scrapling sessions, runtime preflight diagnostics, proxy rotation payloads, and idle shutdown.
- **Phase 3 — local BitNet planning:** implemented an opt-in local JSON planner/router with one-command setup and measured fallback behavior.

## What it is not

- not a browser interaction tool
- not an offline knowledge base
- not a replacement for page navigation
- not faster or more accurate by default with local BitNet planning enabled; current local benchmarks keep heuristics as the safe default

## Quick start

```text
What are the trade-offs between B-trees and LSM-trees?
```

```text
Compare React Server Components with traditional SSR.
```

```text
How do I add retries to a Node.js fetch wrapper?
```

## Modes

| Mode | Best for |
| --- | --- |
| `fast` | quick answers with a quality floor |
| `deep` | broader retrieval with follow-up rounds |
| `code` | docs, READMEs, repositories, and code snippets |
| `academic` | scholarly sources and paper-heavy topics |

## Output

The tool returns structured data including:

- `answer`
- `bullets`
- `sources`
- `citations`
- `codeBlocks`
- `confidence`
- `confidenceScore`
- `sufficient`
- `authoritativeSourcesFound`
- `openSubQuestions`
- `missingAspects`
- `conflictSummary`
- `unverifiedClaims`
- `sourceTypes`
- `meta`

## Public tool parameters

- `query` — research question to answer
- `mode` — `fast`, `deep`, `code`, or `academic`
- `force` — bypass cached sufficiency checks
- `isolate` — run without session/query cache reuse
- `options.allowedSources` — prefer only the listed source hints
- `options.requireAuthoritative` — bias toward authoritative sources
- `options.maxTurns` — limit follow-up rounds
- `options.maxSites` — limit how many sources are read
- `options.minYear` / `options.maxYear` — constrain source dates
- `options.preferRecent` — prefer newer sources
- `options.files` — include local files as sources
- `options.format` — output format: `markdown`, `json`, `table`, or `latex`
- `options.deepResearchConfig` — depth/breadth/concurrency tuning for deeper runs

## Optional local query planner

Run one setup command to install the official `bitnet.cpp` runner, download the default Microsoft BitNet GGUF model, build the local runner, and write local config:

```bash
npx pi-research setup-local-slm
```

Then `pi-research` can route domains and plan search queries locally as JSON before heuristic fallback. On macOS the setup uses Homebrew for missing build dependencies such as Python 3.11 and CMake. The local planner is intentionally opt-in: a real BitNet benchmark showed the existing heuristic router was more accurate and much faster for the current eval slice. Check the setup with:

```bash
npx pi-research doctor-local-slm
```

Overrides: `PI_RESEARCH_LOCAL_SLM=0` disables local planning; `PI_RESEARCH_GGUF_MODEL`, `PI_RESEARCH_LLAMA_CLI`, and `PI_RESEARCH_CONFIG_PATH` override the configured model, runner, or config path.

## Example calls

### Fast mode

```text
query: What is the difference between HTTP and HTTPS?
mode: fast
```

### Deep mode

```text
query: Compare PostgreSQL and MySQL for multi-tenant SaaS
mode: deep
options:
  preferRecent: true
  maxTurns: 2
```

### Code mode

```text
query: How do I add retries to a Node.js fetch wrapper?
mode: code
```

### Academic mode

```text
query: Retrieval augmented generation evaluation methods
mode: academic
```

### Local files as sources

```text
query: Summarize the key points from these notes
mode: fast
options:
  files:
    - ./notes/project-notes.md
    - ./docs/spec.md
```

## Domain packs

Built-in packs now steer routing and source selection:

- `web`
- `github`
- `security`
- `papers`
- `specs`
- `changelog`
- `forums`
- `package-registry`
- `vendor-status`

## Community packs

You can add your own domain pack without changing the core research engine:

1. copy `lib/domains/template.js`
2. implement your domain-specific `run(question, options)` logic
3. register the pack in `lib/domains/index.js`
4. add eval cases in `eval/cases/<your-domain>/`

Starter example:

```js
export default {
  name: "boxing-training",
  sourceHints: ["web"],
  async run(question) {
    return {
      claims: [
        {
          text: `Starter pack example for ${question}`,
          evidence: [{ type: "web", source: "https://example.com", snippet: "Example" }],
          confidence: "medium",
        },
      ],
    };
  },
};
```

## Eval

Run `npm run eval` to execute the eval harness.

## Install

### Pi Coding Agent — extension

Existing Pi users should keep installing the main package:

```bash
pi install npm:pi-research
```

This registers the Pi extension and keeps the public tool name `pi-research`.

### npm install

```bash
npm i pi-research
```

This is the package install command that npm shows on the package page.

### MCP-only — any agent

Run the MCP server directly from npm:

```bash
npx -y pi-research
```

The MCP server identifies itself as `unblind-mcp`, but the tool it exposes is still named `pi-research`.

### Global MCP install

```bash
npm install -g pi-research
unblind-mcp
```

The global install also provides `pi-research` as a CLI alias for the same MCP server:

```bash
pi-research
```

### Local development

```bash
node ./mcp/server.js
```

Convenience script:

```bash
npm run --silent mcp
```

Example MCP config:

```json
{
  "mcpServers": {
    "unblind-mcp": {
      "command": "npx",
      "args": ["-y", "pi-research"]
    }
  }
}
```

Local path config:

```json
{
  "mcpServers": {
    "unblind-mcp": {
      "command": "node",
      "args": ["/path/to/pi-research/mcp/server.js"]
    }
  }
}
```

Compatibility note: `mcp-server.js` remains as a deprecated root-level shim for older local configs.

### Future `unblind-mcp` package

A separate npm package named `unblind-mcp` can be added later as a tiny wrapper around `pi-research`. It should depend on `pi-research` and start the same MCP server, not duplicate the engine.

## Release notes

- Package name: `pi-research`
- Version: `1.3.1`
- Entry point: `extensions/pi-research.ts`
- MCP entry point: `mcp/server.js`
- MCP compatibility shim: `mcp-server.js`
- License: MIT
- Third-party notices: `THIRD_PARTY_NOTICES.md`
- GitHub: `https://github.com/endgegnerbert-tech/pi-research`
