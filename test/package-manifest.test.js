import test from "node:test";
import assert from "node:assert/strict";
import pkg from "../package.json" with { type: "json" };

test("package manifest exposes the pi extension entrypoint", () => {
  assert.equal(pkg.name, "pi-research");
  assert.equal(pkg.pi.extensions[0], "./extensions/pi-research.ts");
});

test("package manifest exposes MCP CLI aliases", () => {
  assert.equal(pkg.bin["pi-research"], "./pi-research.js");
  assert.equal(pkg.bin["unblind-mcp"], "./unblind-mcp.js");
});
