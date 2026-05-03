import test from "node:test";
import assert from "node:assert/strict";
import { getDomainPack, listDomainPacks } from "../lib/domains/index.js";

test("listDomainPacks includes github and security", () => {
  const packs = listDomainPacks();
  assert.ok(packs.includes("github"));
  assert.ok(packs.includes("security"));
});

test("getDomainPack returns the web fallback pack", () => {
  assert.equal(getDomainPack("web").name, "web");
});

test("github pack advertises issue and discussion sources", () => {
  const pack = getDomainPack("github");
  assert.ok(pack.sourceHints.includes("issues"));
  assert.ok(pack.sourceHints.includes("discussions"));
});

test("forums pack advertises stackoverflow and discourse sources", () => {
  const pack = getDomainPack("forums");
  assert.ok(pack.sourceHints.includes("stackoverflow"));
  assert.ok(pack.sourceHints.includes("discourse"));
});
