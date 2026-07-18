import { system } from "@minecraft/server";

const PROTOCOL_VERSION = 1;
const RETRY_TICKS = 100;
const VALID_KINDS = new Set(["entity", "block", "item"]);

function titleCase(value) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_.\/+\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b[a-z]/g, letter => letter.toUpperCase());
}

function fallbackDescriptor(kind, typeId) {
  const separator = typeId.indexOf(":");
  const namespace = separator > 0 ? typeId.slice(0, separator) : "unknown";
  const identifier = separator > 0 ? typeId.slice(separator + 1) : typeId;
  return Object.freeze({
    found: false,
    kind,
    typeId,
    nameKey: undefined,
    fallbackName: titleCase(identifier) || "Unknown Content",
    preferWati: false,
    addonKey: undefined,
    addonName: namespace === "minecraft" ? "Minecraft" : titleCase(namespace) || "Unknown Add-on"
  });
}

export function createWatiClient(consumerId) {
  if (!/^[a-z0-9_.-]{1,64}$/i.test(consumerId)) {
    throw new TypeError("WATI consumerId must contain 1-64 letters, numbers, dots, underscores, or hyphens.");
  }

  const cache = new Map();
  const pending = new Map();
  let sequence = 0;
  let readyVersion;

  function cacheKey(kind, typeId) {
    return `${kind}\u0000${typeId}`;
  }

  function request(kind, typeId) {
    const key = cacheKey(kind, typeId);
    const lastTick = pending.get(key);
    if (lastTick !== undefined && system.currentTick - lastTick < RETRY_TICKS) return;
    pending.set(key, system.currentTick);
    try {
      system.sendScriptEvent("wati:lookup", JSON.stringify({
        v: PROTOCOL_VERSION,
        c: consumerId,
        r: (++sequence).toString(36),
        k: kind,
        i: typeId
      }));
    } catch {
      // WATI es opcional: el consumidor conserva su fallback local.
    }
  }

  system.afterEvents.scriptEventReceive.subscribe(event => {
    if (event.id === "wati:ready") {
      try {
        const message = JSON.parse(event.message);
        if (message?.v !== PROTOCOL_VERSION) return;
        if (readyVersion !== undefined && readyVersion !== message.p) cache.clear();
        readyVersion = message.p;
        pending.clear();
      } catch {
        // Ignora anuncios ajenos o dañados.
      }
      return;
    }
    if (event.id !== "wati:result") return;

    try {
      const result = JSON.parse(event.message);
      if (
        result?.v !== PROTOCOL_VERSION || result.c !== consumerId ||
        !VALID_KINDS.has(result.k) || typeof result.i !== "string"
      ) return;
      const key = cacheKey(result.k, result.i);
      cache.set(key, Object.freeze({
        found: result.f === true,
        kind: result.k,
        typeId: result.i,
        nameKey: typeof result.n === "string" ? result.n : undefined,
        fallbackName: typeof result.d === "string" ? result.d : fallbackDescriptor(result.k, result.i).fallbackName,
        preferWati: result.o === true,
        addonKey: typeof result.ak === "string" ? result.ak : undefined,
        addonName: typeof result.a === "string" ? result.a : fallbackDescriptor(result.k, result.i).addonName
      }));
      pending.delete(key);
    } catch {
      // Un evento de respuesta inválido no debe romper al addon consumidor.
    }
  }, { namespaces: ["wati"] });

  function resolve(kind, typeId) {
    if (!VALID_KINDS.has(kind)) throw new TypeError(`Unsupported WATI kind: ${kind}`);
    if (typeof typeId !== "string" || !typeId.includes(":")) {
      return fallbackDescriptor(kind, String(typeId ?? "unknown:content"));
    }
    const key = cacheKey(kind, typeId);
    const cached = cache.get(key);
    if (cached) return cached;
    request(kind, typeId);
    return fallbackDescriptor(kind, typeId);
  }

  function nameMessage(kind, typeId, legacyKey, options = {}) {
    const descriptor = resolve(kind, typeId);
    // A source pack's localization key is the only option that can follow the
    // player's active language. WATI's generated key remains the safe fallback
    // for consumers that do not have (or do not trust) a source key.
    if (options.preferSource === true && legacyKey && !descriptor.preferWati) return { translate: legacyKey };
    if (descriptor.nameKey) return { translate: descriptor.nameKey };
    if (legacyKey) return { translate: legacyKey };
    return { text: descriptor.fallbackName };
  }

  function addonMessage(kind, typeId) {
    const descriptor = resolve(kind, typeId);
    return descriptor.addonKey
      ? { translate: descriptor.addonKey }
      : { text: descriptor.addonName };
  }

  return Object.freeze({
    resolve,
    warm: resolve,
    nameMessage,
    addonMessage,
    isReady: () => readyVersion !== undefined,
    clearCache: () => {
      cache.clear();
      pending.clear();
    }
  });
}
