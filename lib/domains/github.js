export default {
  name: "github",
  sourceHints: ["issues", "discussions", "pull requests", "readme"],
  async run() {
    return { name: "github" };
  },
};
