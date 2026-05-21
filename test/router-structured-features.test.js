import test from "node:test";
import assert from "node:assert/strict";

import {
  extractConflictStructuredFeatures,
  extractQueryAspectFlags,
  extractSufficiencyStructuredFeatures,
  parseStructuredSources,
} from "../lib/router-structured-features.js";

test("parseStructuredSources extracts typed sources and blocked markers", () => {
  const sources = parseStructuredSources(`Query: x\n\nSources:\n[official_doc] Attention Required! | Cloudflare\n\n[paper] Attention Is All You Need`);
  assert.equal(sources.length, 2);
  assert.equal(sources[0].blocked, true);
  assert.equal(sources[1].authoritative, true);
});

test("extractQueryAspectFlags detects temporal, versioned, comparison, and academic queries", () => {
  const flags = extractQueryAspectFlags("2025 bun vs node compatibility benchmark paper latest");
  assert.equal(flags.temporal, 1);
  assert.equal(flags.versioned, 1);
  assert.equal(flags.comparison, 1);
  assert.equal(flags.academic, 1);
});

test("extractConflictStructuredFeatures summarizes authority and polarity signals", () => {
  const features = extractConflictStructuredFeatures({
    query: "Python 3.12 support status",
    inputText: `Query: x\n\nSources:\n[official_doc] Python 3.12 is supported\n\n[blog] Python 3.12 is not supported`,
  });

  assert.equal(features.query_temporal, 1);
  assert.equal(features.official_doc_count, 1);
  assert.equal(features.blog_count, 1);
  assert.equal(features.positive_signal_sources >= 1, true);
  assert.equal(features.negative_signal_sources >= 1, true);
});

test("extractSufficiencyStructuredFeatures captures authority breadth and blocked sources", () => {
  const features = extractSufficiencyStructuredFeatures({
    query: "Current node LTS version",
    inputText: `Query: x\n\nSources:\n[official_doc] Attention Required! | Cloudflare\n\n[github_readme] Node README\n\n[other] Blog post`,
  });

  assert.equal(features.query_temporal, 1);
  assert.equal(features.blocked_source_count, 1);
  assert.equal(features.authoritative_source_count, 1);
  assert.equal(features.github_readme_count, 1);
});
