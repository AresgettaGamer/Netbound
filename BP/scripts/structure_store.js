import { StructureSaveMode, world } from "@minecraft/server";
import { CONFIG } from "./config.js";

export function captureCell(entity) {
  return {
    x: Math.floor(entity.location.x),
    y: Math.floor(entity.location.y),
    z: Math.floor(entity.location.z)
  };
}

export function saveEntityStructure(entity, structureId) {
  const cell = captureCell(entity);
  return world.structureManager.createFromWorld(
    structureId,
    entity.dimension,
    cell,
    cell,
    {
      includeBlocks: false,
      includeEntities: true,
      saveMode: StructureSaveMode.World
    }
  );
}

export function structureExists(structureId) {
  try {
    return world.structureManager.get(structureId) !== undefined;
  } catch {
    return false;
  }
}

export function deleteStructure(structureId) {
  return world.structureManager.delete(structureId);
}

export function placeStructure(structureId, dimension, location) {
  world.structureManager.place(structureId, dimension, location, {
    includeBlocks: false,
    includeEntities: true
  });
}

export function findCapturedEntity(dimension, location, captureTag) {
  try {
    return dimension.getEntities({
      location,
      maxDistance: 8,
      tags: [captureTag]
    })[0];
  } catch {
    return undefined;
  }
}

export function getAddonStructureIds() {
  try {
    const prefix = `${CONFIG.structureNamespace}:${CONFIG.structurePrefix}`;
    return world.structureManager
      .getWorldStructureIds()
      .filter(identifier => identifier.startsWith(prefix));
  } catch {
    return [];
  }
}
