# pi-research: The Zero-Setup Research Engine for AI Agents

![pi-research logo](docs/assets/pi-research-logo.png)

[![npm version](https://img.shields.io/npm/v/pi-research?color=blue)](https://www.npmjs.com/package/pi-research)
[![tests](https://img.shields.io/badge/tests-121%2F121-brightgreen)](https://github.com/endgegnerbert-tech/pi-research)
[![Pi package](https://img.shields.io/badge/pi-package-blueviolet)](https://pi.ai)

`pi-research` is the ultimate grounding tool built specifically for autonomous AI coding agents. 
It stops agents from hallucinating APIs, guessing library versions, or making up CVE details by providing them with real-time, highly authoritative, and conflict-resolved web research directly into their context window.

![community packs](docs/assets/pi-research-community.png)

## Why it exists

When AI agents perform well, they usually do three things perfectly:
1. Search the exact right places (GitHub, NPM, NIST, arXiv).
2. Prioritize official documentation over random blog posts.
3. Understand when they lack information and ask smart follow-up questions.

`pi-research` automates this entire cognitive loop. It is a completely self-contained, lightning-fast research engine that requires **zero setup**. No external API keys, no heavy local LLMs to configure, and no browser automation to manage.

## Best Practices for Agentic Workflows

To get the most out of `pi-research` inside an agentic loop:
- **`mode: fast`**: Use this for quick factual lookups (e.g., "What is the latest LTS version of Node.js?").
- **`mode: deep`**: Trigger this when dealing with contradictions or unclear requirements (e.g., "Compare React Server Components with traditional SSR"). The system will run multiple follow-up loops.
- **`mode: code`**: The absolute best choice for docs, README-driven development, and retrieving code snippets.
- **`mode: academic`**: Use for paper-heavy, deeply technical architecture research.
- **`options.requireAuthoritative: true`**: Activate this when hallucination is strictly forbidden (e.g., Security, DevOps, compliance).
- **Keep queries specific**: Vague queries yield noisy retrieval. Ask exactly what you need.

## The Breakthrough: Hybrid Tiny-Router Architecture (v1.4.0)

With the release of `1.4.0`, `pi-research` deprecated the slow and heavy generative JSON planners (BitNet/SLMs) in favor of the **Hybrid Tiny-Router Architecture**.

- **Lightning Fast:** Uses `Model2Vec` and Support Vector Classifiers (SVC) to route your queries in **under 1 millisecond** (p95 < 0.6ms).
- **Zero Hallucination Routing:** Achieves 0% high-risk downgrades. A query about a `CVE` will never be downgraded to a generic web search.
- **Structured ML:** Instead of asking a heavy LLM "Is this sufficient?", the tool extracts deterministic *Structured Features* (like `has_authority`, `conflict_state`) and uses ultra-fast Logistic Regression to decide with 100% evaluated accuracy whether to stop or fetch more sources.
- **Fail-Safe IPC:** Uses a robust Node.js-to-Python daemon running line-delimited JSON-RPC 2.0 to ensure zero memory leaks and maximum stability.

## What it does

- Searches the live web and evaluates source authority in real-time.
- Scores, deduplicates, and synthesizes sources.
- Pre-emptively escalates blocked, JS-heavy, or thin pages through an integrated `Scrapling` daemon.
- Caches repeated research and expensive page fetches.
- Extracts code blocks for code-focused programming tasks.
- Ingests local files (`options.files`) to ground research in your current repository context.
- Uses a local ML Tiny-Router to make conservative, highly accurate decisions on domain routing and follow-up loops.
- Returns deeply structured results: citations, confidence scores, conflict summaries, and verifiable claims.

## Current Implementation Status

- **Phase 1 — Speed and Caching:** Persistent research cache reuse, faster fast-mode stopping, and longer TTLs for expensive fetches.
- **Phase 2 — Scrapling Fetch Fallback:** Reusable Python daemon, async Scrapling sessions, proxy rotation payloads, and idle shutdown.
- **Phase 3 — Hybrid Architecture (Tiny-Router):** Highly optimized Node.js-to-Python daemon IPC using structured feature extraction, Model2Vec, and lightweight ML models (SVC/Logistic Regression).
- **Phase 4 — Best Practice Refactoring:** Centralized retrieval policies, deduplicated ML pattern matching, and strict enforcement of model decisions (like `stop` follow-ups) over legacy heuristics.

## Next Steps & Future Vision

We are actively working on scaling the data and reasoning capabilities:
- **LLM Data Augmentation (Weak Supervision):** Generating thousands of synthetic queries for underconfident domains (e.g., `papers`, `package-registry`) to boost the Domain Router's zero-shot accuracy to >95% without manual labeling.
- **Active Learning Telemetry Loop:** Clustering low-confidence predictions stored in the local cache to feed them into a weakly-supervised retraining pipeline—allowing the system to "self-heal" over time.
- **Cross-Encoder for Conflict Detection:** Transitioning from structured Logistic Regression to a fine-tuned Cross-Encoder (e.g., MiniLM with Natural Language Inference) to detect true semantic contradiction across differing texts (e.g., "Node 20 is stable" vs "Node 20 is broken").

## What it is not

- Not a brittle browser automation tool.
- Not a static offline knowledge base.
- Not a heavy, generative free-text local planner.

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

## Optional tiny router

The runtime can use a small local router for conservative domain and follow-up decisions.

Feature flags:

```bash
PI_RESEARCH_TINY_ROUTER=1
PI_RESEARCH_TINY_ROUTER_MODEL=/path/to/pi-research-router
PI_RESEARCH_TINY_ROUTER_TIMEOUT_MS=50
PI_RESEARCH_TINY_ROUTER_DOMAIN=1
PI_RESEARCH_TINY_ROUTER_FOLLOWUP=0
PI_RESEARCH_TINY_ROUTER_CONFLICT=0
PI_RESEARCH_TINY_ROUTER_SUFFICIENCY=0
```

Recommended default: enable only the domain router first, then turn on structured tasks only after reviewing metrics.

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
- Version: `1.4.0`
- Entry point: `extensions/pi-research.ts`
- MCP entry point: `mcp/server.js`
- MCP compatibility shim: `mcp-server.js`
- License: MIT
- Third-party notices: `THIRD_PARTY_NOTICES.md`
- GitHub: `https://github.com/endgegnerbert-tech/pi-research`
