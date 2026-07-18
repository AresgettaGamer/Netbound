import {
  Direction,
  ItemComponentTypes,
  Player,
  world,
  system
} from "@minecraft/server";
import { CONFIG } from "./config.js";
import {
  getCaptureCategory,
  hasOtherEntitiesInCaptureCell,
  inspectEntityForCapture
} from "./entity_policy.js";
import {
  ensureNetId,
  getCaptures,
  getNetId,
  getRegistry,
  isNetboundNet,
  nextCaptureIdentity,
  registerCapture,
  setCaptures,
  unregisterCapture,
  updateNetLore
} from "./net_data.js";
import { send } from "./messages.js";
import {
  captureCell,
  deleteStructure,
  findCapturedEntity,
  getAddonStructureIds,
  placeStructure,
  saveEntityStructure,
  structureExists
} from "./structure_store.js";
import { chooseCapture } from "./ui.js";
import { warmEntityDescriptor } from "./entity_catalog.js";

const captureLocks = new Set();
const releaseLocks = new Set();
const netOperationLocks = new Set();
const activeForms = new Set();

const FACE_OFFSETS = Object.freeze({
  [Direction.Up]: { x: 0, y: 1, z: 0 },
  [Direction.Down]: { x: 0, y: -1, z: 0 },
  [Direction.North]: { x: 0, y: 0, z: -1 },
  [Direction.South]: { x: 0, y: 0, z: 1 },
  [Direction.East]: { x: 1, y: 0, z: 0 },
  [Direction.West]: { x: -1, y: 0, z: 0 }
});

function playerInventory(player) {
  return player.getComponent("minecraft:inventory")?.container;
}

function heldNetAt(player, slot, expectedNetId) {
  if (!player?.isValid) return undefined;
  const inventory = playerInventory(player);
  const item = inventory?.getItem(slot);
  if (!isNetboundNet(item)) return undefined;
  // Las propiedades dinámicas de ItemStack solo están disponibles para tipos
  // realmente no apilables. Esto también rechaza objetos residuales creados
  // cuando una versión anterior del JSON del objeto no pudo registrarse.
  if (item.maxAmount !== 1 || item.amount !== 1) return undefined;
  if (expectedNetId && getNetId(item) !== expectedNetId) return undefined;
  return { inventory, item };
}

function durabilityCost(maxHealth) {
  return Math.max(1, Math.ceil(maxHealth));
}

function canPayDurability(item, cost) {
  const durability = item.getComponent(ItemComponentTypes.Durability);
  if (!durability) return false;
  // Se reserva el último punto para que una red ocupada nunca se destruya y
  // deje inaccesibles sus estructuras.
  return durability.maxDurability - 1 - durability.damage >= cost;
}

function applyDurability(item, cost) {
  const durability = item.getComponent(ItemComponentTypes.Durability);
  if (!durability) throw new Error("Missing durability component");
  durability.damage = Math.min(
    durability.maxDurability - 1,
    Math.floor(durability.damage + cost)
  );
}

function sendPolicyFailure(player, reason) {
  const keys = {
    invalid: "message.netbound.invalid",
    blocked: "message.netbound.blocked",
    no_health: "message.netbound.no_health",
    too_strong: "message.netbound.too_strong",
    linked: "message.netbound.linked",
    leashed: "message.netbound.leashed",
    tamed: "message.netbound.tamed",
    owner_unknown: "message.netbound.owner_unknown",
    other_owner: "message.netbound.other_owner"
  };
  send(player, keys[reason] ?? "message.netbound.capture_failed");
}

function releaseLocation(block, face) {
  const offset = FACE_OFFSETS[face] ?? FACE_OFFSETS[Direction.Up];
  return {
    x: block.location.x + offset.x,
    y: block.location.y + offset.y,
    z: block.location.z + offset.z
  };
}

function recordFromEntity(entity, player, netId, identity, inspection) {
  warmEntityDescriptor(entity.typeId);
  let localizationKey;
  try {
    localizationKey = entity.localizationKey;
  } catch {
    localizationKey = undefined;
  }
  const customName = entity.nameTag?.trim() || undefined;
  return {
    version: 1,
    ...identity,
    netId,
    entityType: entity.typeId,
    localizationKey,
    customName,
    currentHealth: inspection.health.current,
    maxHealth: inspection.health.effectiveMax,
    category: getCaptureCategory(entity, inspection),
    tamed: inspection.isTamed,
    ownerId: inspection.ownerId,
    capturedById: player.id,
    capturedByName: player.name,
    capturedAt: Date.now()
  };
}

async function waitForCapturedEntity(dimension, location, captureTag, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const found = findCapturedEntity(dimension, location, captureTag);
    if (found?.isValid) return found;
    await system.waitTicks(1);
  }
  return findCapturedEntity(dimension, location, captureTag);
}

async function rollbackCapture(record, dimension, originalCell) {
  try {
    placeStructure(record.structureId, dimension, originalCell);
    const restored = await waitForCapturedEntity(
      dimension,
      originalCell,
      record.captureTag
    );
    if (!restored?.isValid) return false;
    if (!deleteStructure(record.structureId)) {
      restored.remove();
      return false;
    }
    restored.removeTag(record.captureTag);
    unregisterCapture(record.captureId);
    return true;
  } catch {
    return false;
  }
}

async function captureEntity(player, entity, slot) {
  if (!player?.isValid || !entity?.isValid) return;
  if (captureLocks.has(entity.id)) {
    send(player, "message.netbound.busy");
    return;
  }
  captureLocks.add(entity.id);

  let identity;
  let record;
  let lockedNetId;
  let structureSaved = false;
  let originalRemoved = false;
  const originalCell = captureCell(entity);
  const originalDimension = entity.dimension;

  try {
    const held = heldNetAt(player, slot);
    if (!held) return;
    const { inventory, item } = held;
    const netId = ensureNetId(item);
    if (netOperationLocks.has(netId)) {
      send(player, "message.netbound.busy");
      return;
    }
    netOperationLocks.add(netId);
    lockedNetId = netId;
    const captures = getCaptures(item);

    if (captures.length >= CONFIG.maxCapturedEntities) {
      send(player, "message.netbound.full", [CONFIG.maxCapturedEntities]);
      return;
    }

    const inspection = inspectEntityForCapture(player, entity);
    if (!inspection.allowed) {
      sendPolicyFailure(player, inspection.reason);
      return;
    }
    if (hasOtherEntitiesInCaptureCell(entity)) {
      send(player, "message.netbound.cell_occupied");
      return;
    }

    const cost = durabilityCost(inspection.health.effectiveMax);
    if (!canPayDurability(item, cost)) {
      send(player, "message.netbound.no_durability", [cost]);
      return;
    }

    identity = nextCaptureIdentity();
    record = recordFromEntity(entity, player, netId, identity, inspection);

    entity.addTag(identity.captureTag);
    saveEntityStructure(entity, identity.structureId);
    structureSaved = structureExists(identity.structureId);
    if (!structureSaved) throw new Error("Structure was not persisted");
    registerCapture(record);

    // La copia guardada conserva la etiqueta; la entidad original no la deja
    // atrás si la eliminación o la escritura del objeto fallan.
    entity.removeTag(identity.captureTag);
    entity.remove();
    originalRemoved = true;

    captures.push(record);
    setCaptures(item, captures);
    applyDurability(item, cost);
    inventory.setItem(slot, item);

    player.playSound("random.orb", { volume: 0.8, pitch: 1.15 });
    send(player, "message.netbound.captured", [captures.length, CONFIG.maxCapturedEntities]);
  } catch (error) {
    if (record && structureSaved && originalRemoved) {
      const rolledBack = await rollbackCapture(record, originalDimension, originalCell);
      send(player, rolledBack
        ? "message.netbound.capture_rolled_back"
        : "message.netbound.capture_recovery_needed");
    } else {
      try {
        if (identity && entity?.isValid) entity.removeTag(identity.captureTag);
        if (identity && structureExists(identity.structureId)) {
          deleteStructure(identity.structureId);
        }
        if (record) unregisterCapture(record.captureId);
      } catch {
        // El registro administrativo conserva el identificador si aplica.
      }
      send(player, "message.netbound.capture_failed");
    }
    console.warn(`[Netbound!] Falló la captura: ${error}`);
  } finally {
    if (lockedNetId) netOperationLocks.delete(lockedNetId);
    captureLocks.delete(entity.id);
  }
}

async function releaseRecord(player, slot, expectedNetId, captureId, dimension, location) {
  const held = heldNetAt(player, slot, expectedNetId);
  if (!held) {
    send(player, "message.netbound.net_changed");
    return;
  }
  const { inventory, item } = held;
  const captures = getCaptures(item);
  const index = captures.findIndex(record => record.captureId === captureId);
  if (index < 0) {
    send(player, "message.netbound.net_changed");
    return;
  }
  const record = captures[index];
  if (releaseLocks.has(record.structureId)) {
    send(player, "message.netbound.busy");
    return;
  }
  if (!structureExists(record.structureId)) {
    send(player, "message.netbound.missing_structure");
    return;
  }

  releaseLocks.add(record.structureId);
  let released;
  let committed = false;
  try {
    placeStructure(record.structureId, dimension, location);
    released = await waitForCapturedEntity(
      dimension,
      location,
      record.captureTag
    );
    if (!released?.isValid) {
      throw new Error("Placed structure did not expose tagged entity");
    }

    // Antes de confirmar la liberación, el objeto debe seguir exactamente en
    // el mismo slot. Si cambió, se retira la copia recién colocada y se conserva
    // la estructura original.
    const stillHeld = heldNetAt(player, slot, expectedNetId);
    if (!stillHeld) {
      released.remove();
      send(player, "message.netbound.net_changed");
      return;
    }

    if (!deleteStructure(record.structureId)) {
      released.remove();
      throw new Error("Could not delete stored structure after placement");
    }

    committed = true;
    released.removeTag(record.captureTag);
    unregisterCapture(record.captureId);
    captures.splice(index, 1);
    setCaptures(item, captures);
    inventory.setItem(slot, item);

    player.playSound("mob.endermen.portal", { volume: 0.7, pitch: 1.2 });
    send(player, "message.netbound.released", [captures.length]);
  } catch (error) {
    if (!committed) {
      const accidental = released ?? findCapturedEntity(dimension, location, record.captureTag);
      try {
        accidental?.remove();
      } catch {
        // Si la entidad ya no es válida, no hay copia que retirar.
      }
      send(player, "message.netbound.release_failed");
    } else {
      // La estructura ya se eliminó: retirar la entidad aquí provocaría una
      // pérdida real. Se conserva liberada y se informa que la red puede tener
      // una referencia obsoleta reparable con el comando administrativo.
      send(player, "message.netbound.released_with_warning");
    }
    console.warn(`[Netbound!] Falló la liberación: ${error}`);
  } finally {
    releaseLocks.delete(record.structureId);
  }
}

async function beginRelease(player, block, face, slot) {
  const held = heldNetAt(player, slot);
  if (!held) return;
  const netId = ensureNetId(held.item);
  held.inventory.setItem(slot, held.item);
  if (netOperationLocks.has(netId)) {
    send(player, "message.netbound.busy");
    return;
  }
  netOperationLocks.add(netId);

  try {
    const captures = getCaptures(held.item);
    if (!captures.length) {
      send(player, "message.netbound.empty");
      return;
    }

    let selectedIndex = 0;
    if (captures.length > 1) {
      if (activeForms.has(player.id)) return;
      activeForms.add(player.id);
      try {
        selectedIndex = await chooseCapture(player, captures);
        if (selectedIndex === undefined) return;
      } catch (error) {
        console.warn(`[Netbound!] Falló el formulario: ${error}`);
        send(player, "message.netbound.ui_failed");
        return;
      } finally {
        activeForms.delete(player.id);
      }
    }

    const selected = captures[selectedIndex];
    if (!selected) return;
    await releaseRecord(
      player,
      slot,
      netId,
      selected.captureId,
      block.dimension,
      releaseLocation(block, face)
    );
  } finally {
    netOperationLocks.delete(netId);
  }
}

world.beforeEvents.playerInteractWithEntity.subscribe(event => {
  if (!isNetboundNet(event.itemStack)) return;
  event.cancel = true;
  const slot = event.player.selectedSlotIndex;
  const player = event.player;
  const target = event.target;
  system.run(() => {
    captureEntity(player, target, slot).catch(error => {
      console.warn(`[Netbound!] Error no controlado de captura: ${error}`);
    });
  });
});

world.beforeEvents.playerInteractWithBlock.subscribe(event => {
  if (!event.isFirstEvent || !isNetboundNet(event.itemStack)) return;
  event.cancel = true;
  if (CONFIG.blockedBlockTypeIds.has(event.block.typeId)) {
    const player = event.player;
    system.run(() => send(player, "message.netbound.blocked_block"));
    return;
  }

  const player = event.player;
  const block = event.block;
  const face = event.blockFace;
  const slot = player.selectedSlotIndex;
  system.run(() => {
    beginRelease(player, block, face, slot).catch(error => {
      console.warn(`[Netbound!] Error no controlado de liberación: ${error}`);
      send(player, "message.netbound.release_failed");
    });
  });
});

// Inicializa o repara el lore sin reescribir el objeto en cada tick.
system.runInterval(() => {
  for (const player of world.getPlayers()) {
    const inventory = playerInventory(player);
    if (!inventory) continue;
    for (let slot = 0; slot < inventory.size; slot++) {
      const item = inventory.getItem(slot);
      if (!isNetboundNet(item)) continue;
      if (item.maxAmount !== 1 || item.amount !== 1) continue;
      const before = item.getDynamicProperty(CONFIG.properties.loreCount);
      const count = getCaptures(item).length;
      if (before === count && item.getRawLore().length >= 3) continue;
      updateNetLore(item, count);
      inventory.setItem(slot, item);
    }
  }
}, 100);

system.afterEvents.scriptEventReceive.subscribe(event => {
  const player = event.sourceEntity;
  if (!(player instanceof Player)) return;

  if (event.id === "netbound:status") {
    const registryCount = Object.keys(getRegistry()).length;
    const structureCount = getAddonStructureIds().length;
    send(player, "message.netbound.status", [registryCount, structureCount]);
    return;
  }

  if (event.id !== "netbound:repair_held") return;
  const slot = player.selectedSlotIndex;
  const held = heldNetAt(player, slot);
  if (!held) {
    send(player, "message.netbound.hold_net");
    return;
  }
  const captures = getCaptures(held.item);
  const valid = captures.filter(record => structureExists(record.structureId));
  for (const record of captures) {
    if (!structureExists(record.structureId)) unregisterCapture(record.captureId);
  }
  const removed = captures.length - valid.length;
  setCaptures(held.item, valid);
  held.inventory.setItem(slot, held.item);
  send(player, "message.netbound.repaired", [removed]);
});
