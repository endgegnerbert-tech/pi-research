import web from "./web.js";

const DOMAIN_NAMES = ["web", "github", "security", "papers", "specs", "changelog", "forums", "package-registry", "vendor-status"];

export function listDomainPacks() {
  return [...DOMAIN_NAMES];
}

export function getDomainPack(name = "web") {
  if (name === "web") return web;
  return web;
}
