import test from "node:test";
import assert from "node:assert/strict";
import { resolveOutputFormat, shouldRequireAuthoritativeSources } from "../lib/research-output.js";

test("resolveOutputFormat respects explicit format", () => {
  assert.equal(resolveOutputFormat({ format: "json" }, "markdown"), "json");
});

test("shouldRequireAuthoritativeSources returns true when requested", () => {
  assert.equal(shouldRequireAuthoritativeSources({ requireAuthoritative: true }, false), true);
});
