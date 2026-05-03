export default {
  name: "security",
  sourceHints: ["cve", "advisory", "security bulletin"],
  async run() {
    return { name: "security" };
  },
};
