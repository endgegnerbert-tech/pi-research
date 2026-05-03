function text(value) {
  return String(value || "").toLowerCase();
}

export function classifyQuestionDomain(question) {
  const q = text(question);
  if (/(cve-|cve\b|advisory|security|vulnerability|exploit)/.test(q)) return "security";
  if (/(github|issue|issues|pull request|pull request|repo|repository|discussions?)/.test(q)) return "github";
  if (/(arxiv|paper|papers|study|research|scientific|scholar)/.test(q)) return "papers";
  if (/(rfc|spec|specification|standard|standards)/.test(q)) return "specs";
  if (/(changelog|release notes?|releases?|version history)/.test(q)) return "changelog";
  if (/(stackoverflow|stack overflow|discourse|reddit|forum|forums)/.test(q)) return "forums";
  if (/(npm|pypi|cargo|maven|package registry|package|library)/.test(q)) return "package-registry";
  if (/(status page|status|outage|incident)/.test(q)) return "vendor-status";
  return "web";
}

export function normalizeResearchMode(input = {}, fallback = "fast") {
  return input && typeof input === "object" && input.mode ? input.mode : fallback;
}
