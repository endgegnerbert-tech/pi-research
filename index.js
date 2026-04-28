import { Type } from "typebox";

import { compactResearchPayload, classifyQueryIntent, inferOfficialDocsSite } from "./lib/research.js";
import { clearResearchMemory, hashResearchQuery, setResearchMemory, shouldSkipResearch } from "./lib/research-memory.js";
import { runWebResearch } from "./lib/web-research.js";

const RESEARCH_STATE = new Map();

function buildWebResearchGuidance() {
  return "Use pi-research for web search and research. Prefer fast mode for simple questions, deep mode for comparisons or ambiguous cases, and code/academic modes when source type matters.";
}

function defaultMode(query) {
  const intent = classifyQueryIntent(query);
  if (intent === "comparison" || intent === "comparative") return "deep";
  if (intent === "academic") return "academic";
  return "fast";
}

function buildFastRecoveryQuery(query) {
  const docsSite = inferOfficialDocsSite(query || "");
  return docsSite ? `site:${docsSite} ${query}` : `${query} official docs`;
}

function toolResponse(payload, text) {
  return { content: [{ type: "text", text }], details: payload };
}

function compactWebResearchToolResult(event) {
  if (event.isError || event.toolName !== "pi-research") return null;
  const payload = event.details;
  if (!payload?.ok || payload.action !== "web_research") return null;

  const compact = compactResearchPayload(payload);
  const citationLines = Array.isArray(compact.citations)
    ? compact.citations.map((citation, index) => `${index + 1}. ${citation.text} [source ${citation.sourceIndex}]`)
    : [];
  const text = [
    payload.contentText,
    "",
    "## Citations",
    "",
    ...(citationLines.length ? citationLines : ["None"]),
    "",
    "## Status",
    "",
    `sufficient: ${compact.sufficient}`,
    `authoritativeSourcesFound: ${compact.authoritativeSourcesFound}`,
    ...(compact.conflictSummary ? [`conflictSummary: ${compact.conflictSummary}`] : []),
  ].join("\n").trim();

  return { content: [{ type: "text", text }] };
}

function getState(queryHash) {
  if (!RESEARCH_STATE.has(queryHash)) RESEARCH_STATE.set(queryHash, { count: 0, lastHash: null, lastSufficient: false, fastRecoveryAllowed: false });
  return RESEARCH_STATE.get(queryHash);
}

export default function webResearchExtension(pi) {
  pi.on("before_agent_start", async (event) => {
    RESEARCH_STATE.clear();
    clearResearchMemory();
    return { systemPrompt: `${event.systemPrompt}\n\n${buildWebResearchGuidance()}` };
  });

  pi.on("tool_call", async (event) => {
    if (event.toolName !== "pi-research") return;
    if (!event.input.mode) event.input.mode = defaultMode(event.input.query || "");

    const queryHash = hashResearchQuery(event.input.query || "");
    const state = getState(queryHash);
    const mode = event.input.mode;
    const isolate = Boolean(event.input.isolate || process.env.RESEARCH_ISOLATE === "1");
    const force = Boolean(event.input.force);

    if (shouldSkipResearch({ queryHash, lastHash: state.lastHash, lastWasSufficient: state.lastSufficient, force, isolate })) {
      return { block: true, reason: "Recent pi-research result was already sufficient for this exact query." };
    }

    if (mode === "fast" && state.count === 1 && state.fastRecoveryAllowed && !force && !isolate) {
      event.input.query = buildFastRecoveryQuery(event.input.query || "");
      state.fastRecoveryAllowed = false;
    }

    state.count += 1;
    state.lastHash = queryHash;
  });

  pi.on("tool_result", async (event) => {
    if (event.toolName === "pi-research" && !event.isError && event.details?.ok) {
      const queryHash = hashResearchQuery(event.input?.query || "");
      const state = getState(queryHash);
      state.lastHash = queryHash;
      state.lastSufficient = Boolean(event.details.sufficient);
      const query = event.input?.query || "";
      state.fastRecoveryAllowed = !event.details.sufficient
        && !event.details.authoritativeSourcesFound
        && ["best_practice", "temporal", "definition"].includes(classifyQueryIntent(query || ""));
      setResearchMemory(`last:${queryHash}`, event.details);
    }
    return compactWebResearchToolResult(event) || undefined;
  });

  pi.registerTool({
    name: "pi-research",
    label: "Pi Research",
    description: "Search and research the web.",
    promptSnippet: "Use this for web research when needed.",
    promptGuidelines: ["Use pi-research for search, source ranking, and summarization."],
    parameters: Type.Object({
      query: Type.String({ description: "Research question to answer from the web" }),
      mode: Type.Optional(Type.Union([Type.Literal("fast"), Type.Literal("deep"), Type.Literal("code"), Type.Literal("academic")], { description: "Research mode", default: "fast" })),
      force: Type.Optional(Type.Boolean({ description: "Bypass sufficiency gating and cached answers for this call" })),
      isolate: Type.Optional(Type.Boolean({ description: "Run this query in isolation without session/query cache reuse" })),
      options: Type.Optional(Type.Object({
        allowedSources: Type.Optional(Type.Array(Type.String())),
        maxTurns: Type.Optional(Type.Number()),
        maxSites: Type.Optional(Type.Number()),
        requireAuthoritative: Type.Optional(Type.Boolean()),
        minYear: Type.Optional(Type.Number()),
        maxYear: Type.Optional(Type.Number()),
        preferRecent: Type.Optional(Type.Boolean()),
        files: Type.Optional(Type.Array(Type.String())),
        format: Type.Optional(Type.Union([Type.Literal("markdown"), Type.Literal("json"), Type.Literal("table"), Type.Literal("latex")], { default: "markdown" })),
        deepResearchConfig: Type.Optional(Type.Object({
          depth: Type.Optional(Type.Union([Type.Literal(1), Type.Literal(2), Type.Literal(3)])),
          breadth: Type.Optional(Type.Union([Type.Literal(2), Type.Literal(3), Type.Literal(4)])),
          concurrency: Type.Optional(Type.Union([Type.Literal(1), Type.Literal(2), Type.Literal(3), Type.Literal(4)])),
        })),
      })),
    }),
    async execute(_toolCallId, params, signal, onUpdate, ctx) {
      const mode = params.mode ?? defaultMode(params.query || "");
      const payload = await runWebResearch(params.query || "", ctx, signal, onUpdate, {
        mode,
        force: params.force,
        isolate: params.isolate,
        ...(params.options || {}),
      });
      return toolResponse(payload, payload.ok ? payload.contentText : JSON.stringify(payload, null, 2));
    },
  });
}
