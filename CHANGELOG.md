# Changelog

## 1.2.1

### Added
- Root-level CLI wrappers `pi-research.js` and `unblind-mcp.js` for npm-publish-safe bin targets.
- README install examples for `npm i pi-research`, MCP-only usage, and global CLI usage.
- Tests covering MCP initialize/list/call, package bin aliases, and shim re-export behavior.

### Changed
- Package metadata now exposes both CLI entry points via `bin`.
- README now documents `npm i pi-research`, `node ./mcp/server.js`, `npm run --silent mcp`, and `npx -y pi-research`.
- Public tool name stays `pi-research` for both the Pi extension and the MCP server.
- MCP server branding stays `unblind-mcp` while the shared engine remains in `pi-research`.

### Fixed
- Global npm bin execution works correctly with publish-safe wrapper entrypoints.
- npm install / global bin flow was verified in an isolated packed install.
- npm publish no longer strips the CLI bin targets.

## 1.1.2

### Added
- MCP stdio server at `mcp/server.js` with CLI aliases `pi-research` and `unblind-mcp`.
- Root-level `mcp-server.js` compatibility shim for older local configs.
- README install examples for Pi extension, MCP-only usage, and global CLI usage.
- Tests covering MCP initialize/list/call, package bin aliases, and shim re-export behavior.

### Changed
- Public tool name stays `pi-research` for both the Pi extension and the MCP server.
- MCP server branding is `unblind-mcp` while the shared engine remains in `pi-research`.
- Package metadata now exposes both CLI entry points via `bin`.
- README now documents `node ./mcp/server.js`, `npm run --silent mcp`, and `npx -y pi-research`.

### Fixed
- Global npm bin execution now works correctly with symlinked entrypoints.
- npm install / global bin flow was verified in an isolated packed install.

## 1.1.1

### Added
- Scrapling-backed page fetch fallback with `AsyncFetcher`, `DynamicFetcher`, and `StealthyFetcher`.
- Internal page fetch adapter with heuristic escalation for blocked, thin, JS-heavy, and anti-bot pages.
- Benchmark assessment note for BrowseComp and FreshQA pilot runs.

### Changed
- `pi-research` tool metadata was refreshed for agent routing.
- Tool guidance now emphasizes current facts, docs, best practices, comparisons, and verification.
- Fetch heuristics were tuned to avoid false positives on normal GitHub pages.
- `web-research` now keeps the fast HTTP path first and escalates only when needed.

## 1.1.0

### Added
- Domain packs now drive routing and source controls for web, github, security, papers, specs, changelog, forums, package-registry, and vendor-status.
- Output formatting now supports `markdown`, `json`, `table`, and `latex`.
- Community pack starter example at `lib/domains/template.js`.
- README guidance for custom domain packs.
- QA report for the universal research layer review.

### Changed
- Intent routing tightened for changelog and vendor-status queries.
- Domain packs now bias search queries and source controls toward domain-specific sources.
- Security, vendor-status, package-registry, forums, papers, specs, and changelog packs now prefer authoritative sources.
- `requireAuthoritative` now affects runtime sufficiency checks.
- `format` now affects tool output rendering.

## 1.0.2

### Added
- MIT license.
- Changelog file.

### Changed
- README now notes the MIT license.

## 1.0.1

### Changed
- Package metadata and install details were updated.

## 1.0.0

### Added
- Standalone `pi-research` package for Pi.
- Install support via `pi install npm:pi-research`.
- Research modes: `fast`, `deep`, `code`, `academic`.
- Source scoring, citations, confidence, follow-up suggestions, and code block extraction.
- English README and public GitHub repo.

### Notes
- The tool name is `pi-research`.
- The internal research action remains `web_research`.
