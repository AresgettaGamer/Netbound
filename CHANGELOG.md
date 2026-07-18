# Changelog

## 1.0.0 — 2026-07-18

First stable public release, promoted from the server-tested 0.5.0 build.

- Capture vanilla and compatible add-on creatures in persistent Bedrock world
  structures.
- Store up to 10 creatures in one reusable net and select which one to release.
- Preserve entity state supported by the structure format, including names,
  health, variants, equipment and data-driven/scripted properties.
- Protect tamed creatures: only their verified owner can capture them.
- Block players, configured bosses, mounted/leashed entities, unsafe helpers
  and creatures over the configured effective-health limit.
- Display creature name, name tag, HP and source add-on in the release menu.
- Optional WATI Core integration with safe fallback when WATI is absent.
- Compatible with Vibrant Visuals through the Resource Pack `pbr` capability.
- Administrative diagnostics through `netbound:status` and
  `netbound:repair_held` Script Events.
- Original Netbound code and assets released under MIT; Catch 'Em All research
  attribution and its MIT notice are included in `THIRD_PARTY_LICENSES`.
