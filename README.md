# pi-research

[![npm version](https://img.shields.io/npm/v/pi-research?color=blue)](https://www.npmjs.com/package/pi-research)
[![tests](https://img.shields.io/badge/tests-56%2F56-brightgreen)](https://github.com/endgegnerbert-tech/pi-research)
[![Pi package](https://img.shields.io/badge/pi-package-blueviolet)](https://pi.ai)

`pi-research` is a Pi extension for fast, local-first web research inside the agent.

It searches the live web, ranks sources, reads the most relevant pages, and synthesizes a grounded answer with citations.
It does **not** require an external research API or API key, and it is not a browser automation tool.

## Why it exists

Agents usually need two things to answer well:

1. a way to search the web efficiently
2. a way to turn sources into a usable answer

`pi-research` does both inside Pi, so the agent can research topics without relying on a separate hosted research service.

## What it does

- searches the live web
- scores and deduplicates sources
- prefers official docs, READMEs, and papers when relevant
- follows up when the first pass is not enough
- extracts code blocks for code-focused questions
- supports local files as additional sources
- returns a structured result with citations and confidence metadata

## What it is not

- not a browser interaction tool
- not an offline knowledge base
- not a replacement for page navigation

## Install

### For Pi

```bash
pi install npm:pi-research
```

### For npm-based workflows

```bash
npm install pi-research
```

GitHub repository: https://github.com/endgegnerbert-tech/pi-research

## Quick start

```text
What are the trade-offs between B-trees and LSM-trees?
```

```text
Show me the best way to add health checks to Docker Compose.
```

```text
Compare React Server Components with traditional SSR.
```

## Modes

| Mode | Best for |
| --- | --- |
| `fast` | quick answers with a quality floor |
| `deep` | broader retrieval with follow-up rounds |
| `code` | docs, READMEs, repositories, and code snippets |
| `academic` | scholarly sources and paper-heavy topics |

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

## How it works

- **query-isolated caching**: repeated identical research can be skipped when the previous result was already sufficient
- **source scoring**: official docs, READMEs, papers, and local files are preferred over weak sources
- **follow-up planning**: unclear or conflicting results trigger another round of research
- **conflict detection**: opposing claims are surfaced explicitly
- **fact checking**: unsupported answer sentences are marked as unverified
- **local source input**: files can be added directly to the research context

## Limits

- it still depends on live web access for web research
- it does not browse pages like a human user
- it is not fully offline unless you only use local files
- it is not a browser interaction tool

## Domain packs

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

You can add your own domain pack by copying `lib/domains/template.js`, adapting the `run()` function, and registering it in `lib/domains/index.js`.

Minimal starter example:

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

## Package info

- Package name: `pi-research`
- Entry point: `extensions/pi-research.ts`
- Tool name: `pi-research`
- License: MIT

## Release notes

- Pi install: `pi install npm:pi-research`
- npm install: `npm install pi-research`
- GitHub: `https://github.com/endgegnerbert-tech/pi-research`
- Community packs: copy the template pack and register it in `lib/domains/index.js`
