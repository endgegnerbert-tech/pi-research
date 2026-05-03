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
