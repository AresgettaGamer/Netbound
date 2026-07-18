import {
  getEntityNameMessage
} from "./entity_catalog.js";

export function translate(key, substitutions = []) {
  if (!substitutions.length) return { translate: key };
  return {
    translate: key,
    with: substitutions.map(value => String(value))
  };
}

export function raw(parts) {
  return { rawtext: parts };
}

export function text(value) {
  return { text: String(value) };
}

export function send(player, key, substitutions = []) {
  try {
    player.sendMessage(translate(key, substitutions));
  } catch {
    // El jugador pudo desconectarse entre la interacción y la respuesta.
  }
}

export function entityNameMessage(record) {
  return getEntityNameMessage(record.entityType, record.localizationKey);
}
