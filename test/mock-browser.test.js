import test from "node:test";
import assert from "node:assert/strict";

import webResearchExtension from "../index.js";

test("webResearchExtension only registers pi-research", () => {
  const tools = [];
  const pi = {
    on() {},
    registerTool(tool) {
      tools.push(tool);
    },
  };

  webResearchExtension(pi);
  assert.equal(tools.some((tool) => tool.name === "pi-research"), true);
});
