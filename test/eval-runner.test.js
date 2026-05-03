import test from "node:test";
import assert from "node:assert/strict";
import { loadEvalCases } from "../lib/eval/case-loader.js";
import { runEvalSuite } from "../lib/eval/runner.js";

test("loadEvalCases loads json files from eval/cases/web", () => {
  const cases = loadEvalCases("web");
  assert.ok(Array.isArray(cases));
});

test("runEvalSuite reports a pass rate", async () => {
  const result = await runEvalSuite({ domain: "web" });
  assert.equal(typeof result.passRate, "number");
});
