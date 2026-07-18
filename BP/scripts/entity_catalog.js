import { createWatiClient } from "./wati_client.js";

const wati = createWatiClient("netbound");

function splitIdentifier(typeId) {
  if (typeof typeId !== "string") return ["unknown", "entity"];
  const separator = typeId.indexOf(":");
  if (separator < 0) return ["unknown", typeId];
  return [typeId.slice(0, separator), typeId.slice(separator + 1)];
}

function titleCaseIdentifier(value) {
  return String(value)
    .replace(/[_\-.]+/g, " ")
    .replace(/\b[a-z]/g, letter => letter.toUpperCase())
    .trim();
}

export function getEntityDescriptor(typeId) {
  return wati.resolve("entity", typeId);
}

export function getEntityNameMessage(typeId, localizationKey) {
  return wati.nameMessage("entity", typeId, localizationKey, { preferSource: true });
}

export function warmEntityDescriptor(typeId) {
  return wati.warm("entity", typeId);
}

export function getCatalogEntityNameKey(typeId) {
  return getEntityDescriptor(typeId).nameKey;
}

export function getAddonNameMessage(typeId) {
  return wati.addonMessage("entity", typeId);
}

export function getAddonDisplayName(typeId) {
  return getEntityDescriptor(typeId).addonName;
}

export function getFallbackEntityName(typeId) {
  const descriptor = getEntityDescriptor(typeId);
  if (descriptor.fallbackName) return descriptor.fallbackName;
  const [, identifier] = splitIdentifier(typeId);
  return titleCaseIdentifier(identifier) || "Unknown Entity";
}
