# pi-research

[![npm version](https://img.shields.io/npm/v/pi-research?color=blue)](https://www.npmjs.com/package/pi-research)
[![tests](https://img.shields.io/badge/tests-33%2F33-brightgreen)](https://github.com/endgegnerbert-tech/pi-research)
[![Pi package](https://img.shields.io/badge/pi-package-blueviolet)](https://pi.ai)

`pi-research` is a Pi extension for web research.

## Install

For Pi:

```bash
pi install npm:pi-research
```

For npm-based workflows:

```bash
npm install pi-research
```

GitHub repository: https://github.com/endgegnerbert-tech/pi-research

You can also fork the repository and install it from a local path while developing.

## What it is for

Use `pi-research` when you want the agent to search and synthesize the web.
It is designed for research, not browser navigation.
Use `browser_action` for clicks, screenshots, DOM inspection, or page interaction.

## Modes

| Mode | Best for |
| --- | --- |
| `fast` | quick answers with a quality floor |
| `deep` | broader retrieval with follow-up rounds |
| `code` | official docs, READMEs, repos, and code snippets |
| `academic` | scholarly sources like arXiv, Semantic Scholar, and DOI papers |

## Key features

- query-isolated caching and sufficiency gating
- source scoring with visible `sourceType`, `authoritative`, `score`, and `freshness`
- `openSubQuestions`, `missingAspects`, `conflictSummary`
- inline citations in the final answer
- `minYear`, `maxYear`, and `preferRecent` support
- `files[]` for local source input
- `codeBlocks[]` extraction for code-focused answers

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
- `followupRounds`
- `followupQuery`
- `openSubQuestions`
- `missingAspects`
- `conflictSummary`
- `conflictingSourcePairs`
- `unverifiedClaims`

## Examples

```text
What are the trade-offs between B-trees and LSM-trees?
```

```text
Show me the best way to add health checks to Docker Compose.
```

```text
Compare React Server Components with traditional SSR.
```

## Package manifest

This repo is a Pi package. The extension entrypoint is:

- `extensions/pi-research.ts`

## Release notes

- Package name: `pi-research`
- Install command for Pi: `pi install npm:pi-research`
- Install command for npm: `npm install pi-research`
- GitHub: `https://github.com/endgegnerbert-tech/pi-research`
- Tool name: `pi-research`
