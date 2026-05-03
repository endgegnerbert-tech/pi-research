export default {
  name: "vendor-status",
  sourceHints: ["status", "incident", "outage"],
  async run() {
    return { name: "vendor-status" };
  },
};
