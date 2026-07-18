import { ActionFormData } from "@minecraft/server-ui";
import { CONFIG } from "./config.js";
import { getAddonNameMessage } from "./entity_catalog.js";
import { entityNameMessage, raw, text, translate } from "./messages.js";

const ICONS = Object.freeze({
  vanilla: "textures/ui/netbound/vanilla",
  addon: "textures/ui/netbound/addon",
  hostile: "textures/ui/netbound/hostile",
  owned: "textures/ui/netbound/owned"
});

export async function chooseCapture(player, captures) {
  const form = new ActionFormData()
    .title(translate("ui.netbound.title"))
    .body(translate("ui.netbound.body", [captures.length, CONFIG.maxCapturedEntities]));

  for (const record of captures) {
    const labelParts = [entityNameMessage(record)];
    if (record.customName) {
      labelParts.push(translate("ui.netbound.name_tag", [record.customName]));
    }
    labelParts.push(
      text(`\nHP: ${Math.floor(record.currentHealth)}/${Math.floor(record.maxHealth)} · `),
      getAddonNameMessage(record.entityType)
    );
    const buttonLabel = raw(labelParts);
    form.button(buttonLabel, ICONS[record.category] ?? ICONS.addon);
  }

  const response = await form.show(player);
  if (response.canceled || response.selection === undefined) return undefined;
  return response.selection;
}
