# pi-research

`pi-research` is a Pi extension for web research.

## Install

```bash
pi install npm:pi-research
```

You can also fork the GitHub repository and install it from a local path while developing.

## What it is for

Use `pi-research` when you want the agent to search and synthesize the web.
It is designed for research, not browser navigation.
Use `browser_action` for clicks, screenshots, DOM inspection, or page interaction.

## Modes

- `fast` — quick search with a quality floor
- `deep` — broader retrieval with follow-up rounds
- `code` — prioritizes official docs, READMEs, repos, and code snippets
- `academic` — searches scholarly sources like arXiv, Semantic Scholar, and DOI-based papers

## Key features

- query-isolated caching and sufficiency gating
- source scoring with visible `sourceType`, `authoritative`, `score`, and `freshness`
- `openSubQuestions`, `missingAspects`, `conflictSummary`
- inline citations in the final answer
- `minYear`, `maxYear`, and `preferRecent` support
- `files[]` for local source input
- `codeBlocks[]` extraction for code-focused answers

## Tool output

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

## Example

```text
What are the trade-offs between B-trees and LSM-trees?
```

```text
Show me the best way to add health checks to Docker Compose.
```

## Package manifest

This repo is a Pi package. The extension entrypoint is:

- `extensions/pi-research.ts`

## Release notes

- Package name: `pi-research`
- Install command: `pi install npm:pi-research`
- Tool name: `pi-research`
