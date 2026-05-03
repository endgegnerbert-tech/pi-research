import web from "./web.js";
import github from "./github.js";
import forums from "./forums.js";

const PACKS = {
  web,
  github,
  forums,
};

const DOMAIN_NAMES = ["web", "github", "security", "papers", "specs", "changelog", "forums", "package-registry", "vendor-status"];

export function listDomainPacks() {
  return [...DOMAIN_NAMES];
}

export function getDomainPack(name = "web") {
  return PACKS[name] || web;
}
