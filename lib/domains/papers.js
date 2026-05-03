export default {
  name: "papers",
  sourceHints: ["arxiv", "semanticscholar", "doi"],
  async run() {
    return { name: "papers" };
  },
};
