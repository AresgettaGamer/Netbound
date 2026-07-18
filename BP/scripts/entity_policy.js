import { CONFIG } from "./config.js";

function getComponent(entity, componentId) {
  try {
    return entity.getComponent(componentId);
  } catch {
    return undefined;
  }
}

function getFamilies(entity) {
  try {
    return getComponent(entity, "minecraft:type_family")?.getTypeFamilies() ?? [];
  } catch {
    return [];
  }
}

function getTameState(entity) {
  const tameable = getComponent(entity, "minecraft:tameable");
  const tameMount = getComponent(entity, "minecraft:tamemount");
  let markedTamed = false;
  try {
    markedTamed = entity.hasComponent("minecraft:is_tamed");
  } catch {
    // Se mantiene false si el componente no se puede consultar.
  }

  let isTamed = markedTamed;
  let ownerId;
  try {
    isTamed ||= tameable?.isTamed === true;
    ownerId = tameable?.tamedToPlayerId;
  } catch {
    isTamed = true;
  }
  try {
    isTamed ||= tameMount?.isTamed === true;
    ownerId ??= tameMount?.tamedToPlayerId;
  } catch {
    isTamed = true;
  }
  return { isTamed, ownerId };
}

export function inspectEntityForCapture(player, entity) {
  if (!entity?.isValid) return { allowed: false, reason: "invalid" };
  if (CONFIG.blockedTypeIds.has(entity.typeId)) {
    return { allowed: false, reason: "blocked" };
  }

  const families = getFamilies(entity);
  if (families.some(family => CONFIG.blockedFamilies.has(family))) {
    return { allowed: false, reason: "blocked" };
  }

  const health = getComponent(entity, "minecraft:health");
  if (!health) return { allowed: false, reason: "no_health" };

  let currentHealth;
  let effectiveMax;
  try {
    currentHealth = health.currentValue;
    effectiveMax = health.effectiveMax;
  } catch {
    return { allowed: false, reason: "invalid" };
  }
  if (!Number.isFinite(effectiveMax) || effectiveMax <= 0) {
    return { allowed: false, reason: "no_health" };
  }
  if (effectiveMax > CONFIG.maxEffectiveHealth) {
    return { allowed: false, reason: "too_strong" };
  }

  const rideable = getComponent(entity, "minecraft:rideable");
  try {
    if (rideable?.getRiders().length) {
      return { allowed: false, reason: "linked" };
    }
  } catch {
    return { allowed: false, reason: "linked" };
  }
  try {
    if (entity.hasComponent("minecraft:riding")) {
      return { allowed: false, reason: "linked" };
    }
  } catch {
    return { allowed: false, reason: "linked" };
  }

  const leashable = getComponent(entity, "minecraft:leashable");
  try {
    if (leashable?.isLeashed) {
      return { allowed: false, reason: "leashed" };
    }
  } catch {
    return { allowed: false, reason: "leashed" };
  }

  const tameState = getTameState(entity);
  if (tameState.isTamed) {
    if (!CONFIG.allowOwnedTamedEntities) {
      return { allowed: false, reason: "tamed" };
    }
    if (!tameState.ownerId) {
      return { allowed: false, reason: "owner_unknown" };
    }
    if (tameState.ownerId !== player.id) {
      return { allowed: false, reason: "other_owner" };
    }
  }

  return {
    allowed: true,
    health: {
      current: currentHealth,
      effectiveMax
    },
    families,
    isTamed: tameState.isTamed,
    ownerId: tameState.ownerId
  };
}

export function getCaptureCategory(entity, inspection) {
  if (inspection.isTamed) return "owned";
  if (inspection.families.includes("monster")) return "hostile";
  return entity.typeId.startsWith("minecraft:") ? "vanilla" : "addon";
}

export function hasOtherEntitiesInCaptureCell(entity) {
  const cell = {
    x: Math.floor(entity.location.x),
    y: Math.floor(entity.location.y),
    z: Math.floor(entity.location.z)
  };
  try {
    const occupants = entity.dimension.getEntities({
      location: cell,
      volume: { x: 1, y: 1, z: 1 }
    });
    return occupants.some(other =>
      other.id !== entity.id && other.typeId !== "minecraft:player"
    );
  } catch {
    return true;
  }
}
