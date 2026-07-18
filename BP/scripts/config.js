export const CONFIG = Object.freeze({
  netItemId: "netbound:net",
  maxCapturedEntities: 10,
  maxEffectiveHealth: 250,
  allowOwnedTamedEntities: true,
  durabilityCostMode: "effective_max_health",

  structureNamespace: "netbound",
  structurePrefix: "captured_",
  captureTagPrefix: "netbound_capture_",

  properties: Object.freeze({
    captures: "netbound:captures",
    netId: "netbound:net_id",
    loreCount: "netbound:lore_count",
    captureCounter: "netbound:capture_counter",
    netCounter: "netbound:net_counter",
    registry: "netbound:registry"
  }),

  blockedTypeIds: new Set([
    "minecraft:player",
    "minecraft:armor_stand",
    "minecraft:agent",
    "minecraft:npc",
    "minecraft:ender_dragon",
    "minecraft:wither",
    "minecraft:warden",
    "minecraft:ender_crystal",

    // Bloqueo preventivo hasta validar sus relaciones multipartes.
    "alexs_mobs:anaconda",
    "alexs_mobs:anaconda_part",
    "alexs_mobs:anaconda_segment",
    "better_on_bedrock:part1",
    "better_on_bedrock:part2",
    "better_on_bedrock:creaking_pot",
    "better_on_bedrock:endstone_projectile",
    "better_on_bedrock:shulker_bullet",
    "better_on_bedrock:lazer_test",
    "better_on_bedrock:magma_crystal",
    "better_on_bedrock:magma_shield",
    "better_on_bedrock:pale_blossom_eye",
    "better_on_bedrock:pale_pumkin_eye",
    "better_on_bedrock:poison_ball",
    "better_on_bedrock:pot_decoy",
    "better_on_bedrock:projectile",
    "better_on_bedrock:soot_collector",
    "better_on_bedrock:soot_eye",
    "better_on_bedrock:soot_eye_beam",
    "better_on_bedrock:soot_yeet",
    "better_on_bedrock:tall_blossom",
    "honkit26113:arena_countdown",
    "honkit26113:arena_entity_counter",
    "honkit26113:arena_monster_placeholder",
    "honkit26113:husk_placeholder",
    "honkit26113:ice_bomb_projectile",
    "honkit26113:slime_placeholder",
    "honkit26113:stray_placeholder",
    "honkit26113:thrown_sand",
    "honkit26113:thrown_slimeball",
    "honkit26113:thrown_soul",
    "honkit26113:thrown_thorn",
    "honkit26113:tracking_thorn",
    "honkit26113:tracking_thorn_placeholder",
    "honkit26113:witch_placeholder",
    "crabbersdelight:crab_bucketing",
    "crabbersdelight:crab_trap",
    "crabbersdelight:splash_potion_of_inkiness"
  ]),

  blockedFamilies: new Set([
    "player",
    "boss",
    "multipart",
    "technical",
    "inanimate"
  ]),

  blockedBlockTypeIds: new Set([
    "minecraft:allow",
    "minecraft:deny",
    "minecraft:border_block"
  ])
});
