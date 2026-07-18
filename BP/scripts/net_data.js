import { world } from "@minecraft/server";
import { CONFIG } from "./config.js";
import { translate } from "./messages.js";

function parseJson(value, fallback) {
  if (typeof value !== "string" || value.length === 0) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function nextCounter(propertyId) {
  const previous = world.getDynamicProperty(propertyId);
  const numeric = typeof previous === "number" && Number.isFinite(previous)
    ? Math.max(0, Math.floor(previous))
    : 0;
  const next = numeric + 1;
  world.setDynamicProperty(propertyId, next);
  return next;
}

export function isNetboundNet(item) {
  return item?.typeId === CONFIG.netItemId;
}

export function getCaptures(item) {
  if (!isNetboundNet(item)) return [];
  const parsed = parseJson(item.getDynamicProperty(CONFIG.properties.captures), []);
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(record => record && typeof record.structureId === "string")
    .slice(0, CONFIG.maxCapturedEntities);
}

export function setCaptures(item, captures) {
  const normalized = Array.isArray(captures)
    ? captures.slice(0, CONFIG.maxCapturedEntities)
    : [];
  item.setDynamicProperty(CONFIG.properties.captures, JSON.stringify(normalized));
  updateNetLore(item, normalized.length);
}

export function ensureNetId(item) {
  const existing = item.getDynamicProperty(CONFIG.properties.netId);
  if (typeof existing === "string" && existing.length > 0) return existing;
  const id = `net_${nextCounter(CONFIG.properties.netCounter).toString(36)}`;
  item.setDynamicProperty(CONFIG.properties.netId, id);
  return id;
}

export function getNetId(item) {
  const value = item?.getDynamicProperty(CONFIG.properties.netId);
  return typeof value === "string" ? value : undefined;
}

export function nextCaptureIdentity() {
  const sequence = nextCounter(CONFIG.properties.captureCounter).toString(36);
  return {
    captureId: sequence,
    structureId: `${CONFIG.structureNamespace}:${CONFIG.structurePrefix}${sequence}`,
    captureTag: `${CONFIG.captureTagPrefix}${sequence}`
  };
}

export function updateNetLore(item, knownCount) {
  if (!isNetboundNet(item)) return;
  const count = Number.isInteger(knownCount) ? knownCount : getCaptures(item).length;
  const prior = item.getDynamicProperty(CONFIG.properties.loreCount);
  if (prior === count && item.getRawLore().length >= 3) return;

  item.setLore([
    translate("lore.netbound.count", [count, CONFIG.maxCapturedEntities]),
    translate("lore.netbound.capture_help"),
    translate("lore.netbound.release_help")
  ]);
  item.setDynamicProperty(CONFIG.properties.loreCount, count);
}

export function getRegistry() {
  const value = parseJson(world.getDynamicProperty(CONFIG.properties.registry), {});
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

export function registerCapture(record) {
  const registry = getRegistry();
  registry[record.captureId] = {
    structureId: record.structureId,
    captureTag: record.captureTag,
    entityType: record.entityType,
    netId: record.netId,
    capturedById: record.capturedById,
    capturedByName: record.capturedByName,
    capturedAt: record.capturedAt
  };
  world.setDynamicProperty(CONFIG.properties.registry, JSON.stringify(registry));
}

export function unregisterCapture(captureId) {
  const registry = getRegistry();
  if (!(captureId in registry)) return;
  delete registry[captureId];
  world.setDynamicProperty(CONFIG.properties.registry, JSON.stringify(registry));
}
