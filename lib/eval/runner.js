import { loadEvalCases } from "./case-loader.js";

export async function runEvalSuite({ domain }) {
  const cases = loadEvalCases(domain);
  const passed = cases.filter((item) => item.expectedDomain === domain).length;
  const total = cases.length;
  return { total, passed, passRate: total ? passed / total : 0 };
}
