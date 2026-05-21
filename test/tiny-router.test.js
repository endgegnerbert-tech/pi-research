import test from "node:test";
import assert from "node:assert/strict";
import {
  applyConflictTinyRouterDecision,
  applySufficiencyTinyRouterDecision,
  classifyDomainWithTinyRouter,
  classifyFollowupWithTinyRouter,
  stopTinyRouterDaemon,
} from "../lib/tiny-router.js";

const TEST_ENV = {
  PI_RESEARCH_TINY_ROUTER: "1",
  PI_RESEARCH_TINY_ROUTER_FOLLOWUP: "1",
  PI_RESEARCH_TINY_ROUTER_MODEL: ".cache/models/pi-research-router",
  PI_RESEARCH_TINY_ROUTER_PYTHON: ".venv-router/bin/python"
};

test("tiny router returns null if disabled", async () => {
  const result = await classifyDomainWithTinyRouter("CVE-1234", "fast", undefined, { PI_RESEARCH_TINY_ROUTER: "0" });
  assert.equal(result, null);
});

test("tiny router works when enabled", async () => {
  try {
    const result = await classifyDomainWithTinyRouter("CVE-2024-3094 xz utils", "fast", undefined, TEST_ENV);
    // It should route to security with high confidence
    assert.equal(result, "security");
    
    const resultWeb = await classifyDomainWithTinyRouter("how to boil an egg", "fast", undefined, TEST_ENV);
    // It should fall back to heuristic (return null) if confidence is low
    assert.equal(resultWeb, null);

  } finally {
    stopTinyRouterDaemon();
  }
});

test("tiny router followup classifier returns null unless explicitly enabled", async () => {
  const result = await classifyFollowupWithTinyRouter(
    "is bun faster than node",
    "deep",
    "severe",
    { has_authority: true, has_forum: true, has_news: true, source_count: 5 },
    undefined,
    { ...TEST_ENV, PI_RESEARCH_TINY_ROUTER_FOLLOWUP: "0" }
  );
  assert.equal(result, null);
});

test("tiny router followup classifier works when explicitly enabled", async () => {
  try {
    // 1. A query with severe conflict and both sources
    const actionConflict = await classifyFollowupWithTinyRouter(
      "is bun faster than node",
      "deep",
      "severe",
      { has_authority: true, has_forum: true, has_news: true, source_count: 5 },
      undefined,
      TEST_ENV
    );
    assert.equal(actionConflict, "need_conflict_resolution");

    // 2. A query missing authority in deep mode
    const actionAuth = await classifyFollowupWithTinyRouter(
      "docker network isolate container",
      "deep",
      "none",
      { has_authority: false, has_forum: true, source_count: 4 },
      undefined,
      TEST_ENV
    );
    assert.equal(actionAuth, "need_authority");

    const actionStop = await classifyFollowupWithTinyRouter(
      "Docker Compose official documentation",
      "fast",
      "none",
      { has_authority: true, has_forum: false, has_news: false, source_count: 4 },
      undefined,
      TEST_ENV
    );
    assert.equal(actionStop, "stop");

  } finally {
    stopTinyRouterDaemon();
  }
});


test("conflict clearing stays blocked in V1 by default", () => {
  const result = applyConflictTinyRouterDecision(true, "resolved_by_authority");
  assert.equal(result, true);
});

test("conflict decision may still escalate uncertain cases", () => {
  const result = applyConflictTinyRouterDecision(false, "needs_review");
  assert.equal(result, true);
});

test("sufficiency model alone cannot flip insufficient to sufficient in V1", () => {
  const result = applySufficiencyTinyRouterDecision(false, "sufficient");
  assert.equal(result, false);
});

test("sufficiency decision may veto a premature sufficient result", () => {
  const result = applySufficiencyTinyRouterDecision(true, "need_authority");
  assert.equal(result, false);
});
