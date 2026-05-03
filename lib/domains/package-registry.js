export default {
  name: "package-registry",
  sourceHints: ["npm", "pypi", "cargo", "maven"],
  async run() {
    return { name: "package-registry" };
  },
};
