# Agent Guidelines: CoC7 HUD

A Foundry VTT **v14** module that adds a hideable bottom-of-screen investigator HUD for the
**Call of Cthulhu 7th Edition** system (verified against CoC7 **8.16**). It is a sibling of
`/home/koraka/Projects/nimble-hud` and follows the same structure and conventions.

## Critical rules

- **All CoC7-specific access lives in `src/adapter/systemAdapter.ts`.** Components never read
  `actor.system...`, `CONFIG.statusEffects` or system settings directly.
- **Never mutate documents directly.** Use `actor.update()`, `item.update()` or the system's methods.
- **Delegate game logic to the system.** Rolls go through the actor's public checks
  (`attributeCheck`, `characteristicCheck`, `skillCheck`, `weaponCheck`), the same calls CoC7's macros
  and Token Action HUD CoC7 make, so dialogs and chat cards match the sheet. Shift = skip the dialog.
- **The HUD cannot import system code.** `CoC7RollNormalize`, `CoC7ChatDamage` and friends are internal
  to the system bundle. Reach CoC7 only through documents and runtime globals (`game.CoC7`).
- **Bound actor = the system's macro speaker rule:** exactly one controlled token, otherwise the user's
  assigned character. Investigators (`character`) for everyone; a Keeper who controls a single `npc` or
  `creature` token gets the NPC HUD (`actorKind`), which drops unset bars and the daily sanity chip and
  adds Sanity loss and attacks per round.
- **Reactivity is hook-driven.** Components read inside `$derived.by` blocks that touch
  `hudState.version`; the adapter's `subscribe()` bumps it.
- **Themes:** every color is a token on `#coc7-hud-root` in `src/styles/global.css`, with a light override
  under `.coc7-hud--light`. Never write a literal color in a component. `src/hud/theme.ts` watches the
  `theme-light` / `theme-dark` classes Foundry puts on `#interface` (default) or `<body>`.
- **Transparency:** the HUD carries Foundry's `faded-ui` class, so it follows the core Interface Fade
  opacity and speed (`--ui-fade-*`). It stays opaque while a drawer is open or an input has focus.
- **No Svelte 4 syntax.** Use `$props()`, `$state`, `$derived`, `$effect`, `onclick`.
- **Runes outside `.svelte` files need the `.svelte.ts` extension.**
- **Foundry documents are class instances:** store them with `$state.raw`, never `$state`.
- **No barrel files.**
- **Localization:** English and German. HUD strings live in `public/lang/en.json` and `de.json` under
  `COC7_HUD` (same keys, same order), read with `t()`. Text that must match the sheet uses the system's keys
  with `ts('CoC7...')`; where a CoC7 language lacks a key (German has no
  `CoC7.RollDamageRange`), use `tsOr(systemKey, hudKey)` with a HUD key in both files.
- **Tooltips:** every HUD tooltip uses `data-hud-tooltip="..."` (`src/hud/tooltip.ts`). Never Foundry's
  `data-tooltip` or `title`.
- **`@ts-expect-error`, not `@ts-ignore`**, with a comment explaining why.

## Commands

- `npm install`, then `npm run dev` (rebuilds `dist/` on change) or `npm run build`.
- `npm run check` runs `svelte-check` and the Vitest suite. Run it before finishing a task.
- `dist/` is a complete Foundry module folder, symlinked to `Data/modules/coc7-hud`.

## Layout

| Path | Purpose |
| --- | --- |
| `src/main.ts` | Hook registration, mounts the HUD at `ready` |
| `src/adapter/systemAdapter.ts` | The only file that knows CoC7's data model |
| `src/adapter/derive.ts` | Pure helpers (tested in `derive.test.ts`) |
| `src/adapter/types.ts` | View types produced by the adapter |
| `src/state/hudState.svelte.ts` | Reactive HUD state (bound actor, settings, theme, `version`) |
| `src/hud/*.svelte`, `src/hud/*.ts` | UI components, tooltip and theme watcher |
| `public/module.json`, `public/lang/` | Copied into `dist/` unchanged |

## Known unknowns (verify in Foundry, then delete from this list)

- Phase 1 is untested in Foundry: bars, conditions overlay, theme switching, collapse and docking.
- Phase 2 drawers are untested in Foundry. Characteristics use `actor.characteristicCheck`. Skills use `actor.skillCheck(uuid)`. The experience tick is shown, not editable.
- Spells, Pulp Talents and Inventory (item types `item`, `book`, `armor`, one heading each) sit on the bar (`src/hud/SideSlots.svelte`) where Nimble HUD has its quick bar
  (Idea, Know and a Rest button were dropped from the HUD at Tim's request). A quick bar was
  tried and removed: dropping onto it did not work in Foundry.
- The NPC HUD is untested in Foundry, including for creatures (assumed to share the NPC data model). Its Spells and
  Pulp Talents buttons (item types `spell`, `talent`, shared with investigators) open a list drawer;
  clicking an entry opens the item's sheet (`openItemSheet`, like the sheet's `_onItemEdit`). The Sanity loss
  chip calls the NPC sheet's own `_onSanCheck(event)` (private API, works with the sheet closed); re-check after updates.
- Conditions are read from `system.conditions.<id>.value` with icons from `CONFIG.statusEffects`, plus any
  other status effect on the actor. Check that toggling a condition on the token shows up.
- The portrait uses `actor.portrait` (token art when CoC7's "use token" setting is on). Its width follows the
  image's aspect ratio (clamped to 0.4 to 2, letterboxed beyond) so the whole picture shows.
- Phase 3 combat drawer is untested in Foundry. Attacks use `actor.weaponCheck({ id })`; damage is only
  shown in the tooltip, since the attack chat card rolls it. Ammo uses `weapon.system.addAmmunition / reload / shootAmmunition / setBullets`.
  Initiative uses `game.combat.rollInitiative` (CoC7 overrides it) and the combatant flag `CoC7.hasGun`.
