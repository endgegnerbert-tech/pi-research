# Changelog

## Unreleased

### Added
- Phase 1 speed/caching improvements: persistent research-cache reuse, fast-mode early stopping after enough usable pages, and longer cache TTLs for expensive page fetches.
- Phase 2 Scrapling fallback runtime: reusable Python daemon, async `AsyncDynamicSession`/`AsyncStealthySession`, runtime preflight diagnostics, proxy rotation payloads, and idle daemon shutdown.
- Phase 3 local planning path: opt-in BitNet/`bitnet.cpp` JSON router and query planner with `pi-research setup-local-slm` and `pi-research doctor-local-slm` commands.
- User-cache based local SLM setup using `~/.cache/pi-research` for models/runners and `~/.config/pi-research/local-slm.json` for config.
- Regression tests for local SLM config, CLI invocation, Scrapling daemon reuse, blocked-page escalation, caching, and local-file source merging.

### Changed
- Blocked, JS-heavy, weak, and anti-bot pages now escalate through the fetch adapter instead of relying only on plain HTTP/Jina paths.
- Local BitNet planning remains opt-in and fallback-safe because real local benchmarks did not beat the deterministic heuristic router on the current eval slice.
- README now documents the three implemented phases, the local setup command, and the benchmark caveat.

### Fixed
- Scrapling dynamic/stealth fetches now use async Scrapling sessions instead of mixing Playwright sync APIs inside an asyncio loop.
- Scrapling runtime selection now prefers `.venv-scrapling` when present and reports missing Python dependencies clearly.
- Warm daemon processes no longer keep Node test/process shutdown hanging.

### Validation
- Full suite: `npm run test` passes 90/90 tests.
- Eval suite: `npm run eval` passes 4/4 tests.
- Real BitNet smoke: Microsoft BitNet GGUF loads through official `bitnet.cpp`; benchmark result was heuristic domain routing 5/5 vs BitNet 2/5 with about 35.8s per domain+plan case on this machine.

## 1.3.1

### Fixed
- npm `bin` metadata now points to `bin/pi-research.js` and `bin/unblind-mcp.js` so publish no longer warns and strips invalid entries.
- CLI wrapper files are now aligned with npm publish expectations for the next release.

## 1.3.0

### Added
- Retrieval policy document at `docs/policies/pi-research-retrieval-policy.md` to freeze authority, weak-page, and follow-up rules.
- `lib/research-policy.js` with shared authority matrix, weak/blocked thresholds, and deterministic follow-up query builders.
- Regression tests for blocked placeholders, vendor research authority, ResearchGate handling, and search-oriented follow-up queries.
- Deterministic eval cases for weak-page detection, follow-up behavior, and authority checks across `web`, `github`, `security`, and `papers`.

### Changed
- Follow-up queries now stay search-oriented and stop using meta-question phrasing like `Which authoritative source...`.
- Vendor research hosts such as `research.ibm.com` and `research.google` are now classified above generic `other` pages for relevant technical queries.
- Eval runner now reports behavior-based check coverage instead of only counting domain labels.
- Agent-start analytics now log prompt length instead of the full system prompt body.

### Fixed
- Repeated zero-result follow-up loops are now cut short instead of wasting turns on the same dead-end query shape.
- Blocked placeholders such as `Access denied`, `Temporarily Unavailable`, and Cloudflare challenge pages are filtered earlier and no longer treated like normal evidence.
- Unsupported content types such as PDFs now try a targeted fallback path before being dropped as unreadable.
- Cached blocked/placeholder pages are revalidated before reuse.

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
