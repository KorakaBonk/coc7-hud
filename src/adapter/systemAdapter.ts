/**
 * The ONLY place that knows how the CoC7 system stores and exposes its data.
 *
 * Everything the HUD needs from CoC7 goes through here, so a system update that moves a data
 * path breaks one file instead of every component. Paths verified against CoC7 8.16 (Foundry
 * v14). See AGENTS.md for the rules this file follows.
 */
import { tf, ts } from '../localize.ts';
import {
	checkValues,
	clampMeter,
	clampPercent,
	isWholeNumber,
	joinSummary,
	toLabel,
	toNumber,
} from './derive.ts';
import type {
	CharacteristicKey,
	CharacteristicView,
	ActorKind,
	CombatSkillView,
	ConditionView,
	DamageView,
	InitiativeView,
	ItemGroupView,
	ItemListKind,
	ItemView,
	MeterKey,
	MeterView,
	RollableAttribute,
	SkillView,
	VitalsView,
	WeaponView,
} from './types.ts';

/* eslint-disable @typescript-eslint/no-explicit-any */
type CoC7Actor = any;

/** CoC7 shows Luck out of 99; the attribute has no stored maximum. */
const LUCK_MAX = 99;

// ---------------------------------------------------------------------------
// Binding
// ---------------------------------------------------------------------------

/** Actor types a Keeper gets the reduced HUD for. */
const NPC_TYPES = new Set(['npc', 'creature']);

/**
 * Which actor the HUD shows. This mirrors the rule CoC7's own macros use
 * (`ChatMessage.getSpeaker()`): exactly one controlled token, otherwise the user's assigned
 * character. The macros roll for that same actor, so the HUD must never show a different one.
 * Investigators get the HUD for everyone; a Keeper who controls a single NPC or creature token
 * gets the NPC HUD.
 */
export function getBoundActor(): CoC7Actor | null {
	const controlled: any[] = canvas?.tokens?.controlled ?? [];
	const tokenActor = controlled.length === 1 ? controlled[0]?.actor : null;
	const actor = tokenActor ?? game.user?.character ?? null;
	if (actor?.type === 'character') return actor;
	return game.user?.isGM && tokenActor && NPC_TYPES.has(tokenActor.type) ? tokenActor : null;
}

export function actorKind(actor: CoC7Actor | null): ActorKind {
	return NPC_TYPES.has(actor?.type) ? 'npc' : 'investigator';
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

/** Null when the attribute is unset (NPCs often leave Sanity, Luck or MP empty). */
function readOptionalMeter(value: unknown, max: unknown): MeterView | null {
	return value === null || value === undefined || value === '' ? null : readMeter(value, max);
}

function readMeter(value: unknown, max: unknown): MeterView {
	const current = toNumber(value);
	const maximum = toNumber(max);
	return { value: current, max: maximum, percent: clampPercent(current, maximum) };
}

/**
 * Archetype (NPCs: type), occupation and age, e.g. "Scholar · Antiquarian · 42 years old". Like
 * the sheet, an archetype or occupation item on the actor wins over the free-text field.
 */
function buildSummary(actor: CoC7Actor): string {
	const infos = actor.system?.infos ?? {};
	const age = toLabel(infos.age);
	return joinSummary([
		actorKind(actor) === 'npc' ? infos.type : (actor.archetype?.name ?? infos.archetype),
		actor.occupation?.name ?? infos.occupation,
		age && isWholeNumber(age) ? tf('age', { age }) : age,
	]);
}

/** The portrait the sheet shows: the token art when CoC7's "use token" setting is on. */
function readPortrait(actor: CoC7Actor): string {
	return actor.portrait ?? actor.img ?? '';
}

export function readVitals(actor: CoC7Actor): VitalsView {
	const kind = actorKind(actor);
	const attribs = actor.system?.attribs ?? {};
	const special = actor.system?.special ?? {};
	const san = attribs.san ?? {};
	const sanity = readOptionalMeter(san.value, san.max);
	const mov = attribs.mov?.value;
	const passed = toLabel(special.sanLoss?.checkPassed);
	const failed = toLabel(special.sanLoss?.checkFailled);

	return {
		kind,
		name: actor.name ?? '',
		summary: buildSummary(actor),
		img: readPortrait(actor),
		// Investigators always show all four bars, as on the sheet.
		hp: kind === 'npc' ? readOptionalMeter(attribs.hp?.value, attribs.hp?.max) : readMeter(attribs.hp?.value, attribs.hp?.max),
		mp: kind === 'npc' ? readOptionalMeter(attribs.mp?.value, attribs.mp?.max) : readMeter(attribs.mp?.value, attribs.mp?.max),
		san:
			kind === 'npc' && !sanity
				? null
				: {
						...(sanity ?? readMeter(0, san.max)),
						dailyLoss: toNumber(san.dailyLoss),
						dailyLimit: toNumber(san.dailyLimit),
					},
		luck: kind === 'npc' ? readOptionalMeter(attribs.lck?.value, LUCK_MAX) : readMeter(attribs.lck?.value, LUCK_MAX),
		mov: mov === null || mov === undefined ? null : toNumber(mov),
		build: toLabel(attribs.build?.value),
		db: toLabel(attribs.db?.value),
		// Armor is always shown; an unset value counts as no armor.
		armor: toLabel(attribs.armor?.value) ?? '0',
		sanLoss: kind === 'npc' && (passed || failed) ? `${passed ?? '0'}/${failed ?? '0'}` : null,
		attacksPerRound: kind === 'npc' ? toLabel(special.attacksPerRound) : null,
	};
}

/** CoC7's dead condition and Foundry's core dead status share this id. */
const DEAD_STATUS = 'dead';

/**
 * Active conditions. CoC7 keeps its own conditions in `system.conditions.<id>.value` (backed
 * by status effects when the system's status icons setting is on); any other status effect on
 * the actor (Foundry's core ones, e.g. Blind) is listed too.
 */
export function readConditions(actor: CoC7Actor): ConditionView[] {
	const statusEffects: any[] = CONFIG?.statusEffects ?? [];
	const byId = new Map(statusEffects.map((effect) => [effect.id, effect]));
	const result: ConditionView[] = [];
	const seen = new Set<string>();

	for (const [id, condition] of Object.entries<any>(actor.system?.conditions ?? {})) {
		if (!condition?.value) continue;
		const status = byId.get(id);
		seen.add(id);
		result.push({ id, name: ts(status?.name ?? id), img: status?.img ?? '', dead: id === DEAD_STATUS });
	}

	for (const effect of actor.effects ?? []) {
		if (effect.disabled || !effect.statuses || effect.statuses.size === 0) continue;
		if ([...effect.statuses].some((status: string) => seen.has(status))) continue;
		result.push({
			id: effect.id,
			name: effect.name ?? '',
			img: effect.img ?? '',
			dead: effect.statuses.has(DEAD_STATUS),
		});
	}

	return result;
}

/** The characteristics in sheet order, with the system's own short and long names. */
const CHARACTERISTICS: { key: CharacteristicKey; short: string; label: string }[] = [
	{ key: 'str', short: 'CHARAC.STR', label: 'CHARAC.Strength' },
	{ key: 'con', short: 'CHARAC.CON', label: 'CHARAC.Constitution' },
	{ key: 'siz', short: 'CHARAC.SIZ', label: 'CHARAC.Size' },
	{ key: 'dex', short: 'CHARAC.DEX', label: 'CHARAC.Dexterity' },
	{ key: 'app', short: 'CHARAC.APP', label: 'CHARAC.Appearance' },
	{ key: 'int', short: 'CHARAC.INT', label: 'CHARAC.Intelligence' },
	{ key: 'pow', short: 'CHARAC.POW', label: 'CHARAC.Power' },
	{ key: 'edu', short: 'CHARAC.EDU', label: 'CHARAC.Education' },
];

/** The eight characteristics, in sheet order. */
export function readCharacteristics(actor: CoC7Actor): CharacteristicView[] {
	const characteristics = actor.system?.characteristics ?? {};
	return CHARACTERISTICS.map(({ key, short, label }) => ({
		key,
		short: ts(short),
		label: ts(label),
		...checkValues(toNumber(characteristics[key]?.value)),
	}));
}

/** The item types each side-slot drawer lists, in order, with the system's heading for each. */
const ITEM_LISTS: Record<ItemListKind, { type: string; label: string }[]> = {
	spells: [{ type: 'spell', label: 'CoC7.Spells' }],
	talents: [{ type: 'talent', label: 'CoC7.PulpTalents' }],
	items: [
		{ type: 'item', label: 'CoC7.Items' },
		{ type: 'book', label: 'CoC7.Books' },
		{ type: 'armor', label: 'CoC7.Armor' },
	],
};

/** The actor's spells, Pulp talents or inventory, one group per item type, each sorted by name. */
export function readItemGroups(actor: CoC7Actor, kind: ItemListKind): ItemGroupView[] {
	return ITEM_LISTS[kind].map(({ type, label }) => {
		const items: ItemView[] = [];
		for (const item of actor.items ?? []) {
			if (item.type === type) items.push({ id: item.id, name: item.name ?? '', img: item.img ?? '' });
		}
		items.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
		return { type, label: ts(label), items };
	});
}

/** The system's Dodge skill id; Dodge has no combat property but belongs with the combat skills. */
const DODGE_COCID = 'i.skill.dodge';

/** Fighting, Firearms, Throw and similar skills, plus Dodge: the ones the Combat drawer lists. */
function isCombatSkill(item: any): boolean {
	const properties = item.system?.properties ?? {};
	const isDodge = item.flags?.[game.system.id]?.cocidFlag?.id === DODGE_COCID;
	return Boolean(properties.fighting || properties.firearm || properties.ranged || isDodge);
}

/** The investigator's skills without the combat skills, sorted by name as on the sheet. */
export function readSkills(actor: CoC7Actor): SkillView[] {
	const skills: SkillView[] = [];
	for (const item of actor.items ?? []) {
		if (item.type !== 'skill' || isCombatSkill(item)) continue;
		skills.push({
			id: item.id,
			name: item.name ?? '',
			flagged: Boolean(item.system?.flags?.developement),
			...checkValues(toNumber(item.system?.value)),
		});
	}
	return skills.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
}

const DAMAGE_RANGES: DamageView['range'][] = ['normal', 'long', 'extreme'];

/** Weapons as the sheet's Combat tab lists them: melee first, then ranged, each by name. */
export function readWeapons(actor: CoC7Actor): WeaponView[] {
	const weapons: WeaponView[] = [];
	for (const item of actor.items ?? []) {
		if (item.type !== 'weapon') continue;
		const system = item.system ?? {};
		const ranged = Boolean(system.properties?.rngd);
		const skill = system.isSkillSet ? system.skillMain : null;
		const capacity = toNumber(system.bullets);

		weapons.push({
			id: item.id,
			name: item.name ?? '',
			img: item.img ?? '',
			ranged,
			skill: skill ? { name: skill.name ?? '', ...checkValues(toNumber(skill.system?.value)) } : null,
			damages: DAMAGE_RANGES.flatMap((range) => {
				const entry = system.range?.[range];
				const formula = toLabel(entry?.damage);
				return formula ? [{ range, formula, distance: ranged ? (toLabel(entry?.value) ?? '') : '' }] : [];
			}),
			damageBonus: system.properties?.addb ? 'full' : system.properties?.ahdb ? 'half' : null,
			ammo: ranged && capacity > 0 ? { current: toNumber(system.ammo), max: capacity } : null,
		});
	}
	return weapons.sort((a, b) => Number(a.ranged) - Number(b.ranged) || a.name.localeCompare(b.name, game.i18n.lang));
}

/** Fighting, Firearms, Throw and similar skills, plus Dodge, as Token Action HUD CoC7 lists them. */
export function readCombatSkills(actor: CoC7Actor): CombatSkillView[] {
	const skills: CombatSkillView[] = [];
	for (const item of actor.items ?? []) {
		if (item.type !== 'skill' || !isCombatSkill(item)) continue;
		skills.push({ id: item.id, name: item.name ?? '', ...checkValues(toNumber(item.system?.value)) });
	}
	return skills.sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));
}

/** The combatant for the bound actor in the combat on the viewed scene. */
function findCombatant(actor: CoC7Actor): any | null {
	const combat = game.combat;
	if (!combat) return null;
	const tokenId = actor.token?.id;
	return (
		combat.combatants.find((combatant: any) =>
			tokenId ? combatant.tokenId === tokenId : combatant.actorId === actor.id,
		) ?? null
	);
}

export function readInitiative(actor: CoC7Actor): InitiativeView | null {
	const combatant = findCombatant(actor);
	if (!combatant) return null;
	const initiative = combatant.initiative;
	return {
		combatantId: combatant.id,
		initiative: typeof initiative === 'number' ? initiative : null,
		hasGun: Boolean(combatant.getFlag(game.system.id, 'hasGun')),
	};
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

const METER_PATHS: Record<MeterKey, string> = {
	hp: 'system.attribs.hp.value',
	mp: 'system.attribs.mp.value',
	san: 'system.attribs.san.value',
	lck: 'system.attribs.lck.value',
};

function meterMax(actor: CoC7Actor, key: MeterKey): number {
	if (key === 'lck') return LUCK_MAX;
	return toNumber(actor.system?.attribs?.[key]?.max);
}

function meterValue(actor: CoC7Actor, key: MeterKey): number {
	return toNumber(actor.system?.attribs?.[key]?.value);
}

/**
 * Sets a bar's current value, clamped to 0..max. Sanity goes through CoC7's `actor.setSan`, the
 * method its sanity check cards use: a loss is added to the daily loss, a loss of 5 or more
 * sets Bout of Madness, reaching the daily limit sets Indefinite Insanity, and the Pulp
 * half-loss-for-Luck rule is offered. The other bars write the same field the sheet edits.
 */
export function setMeter(actor: CoC7Actor, key: MeterKey, value: number): void {
	const next = clampMeter(value, meterMax(actor, key));
	if (next === null || next === meterValue(actor, key)) return;
	if (key === 'san') void actor.setSan(next);
	else void actor.update({ [METER_PATHS[key]]: next });
}

/** Adds (or, when negative, removes) points, e.g. the HUD's +/- buttons. */
export function changeMeter(actor: CoC7Actor, key: MeterKey, delta: number): void {
	setMeter(actor, key, meterValue(actor, key) + delta);
}

/**
 * Rolls Sanity or Luck through CoC7's own check, so the dialog and chat card match the sheet.
 * Shift skips the dialog, as it does on the sheet and in Token Action HUD CoC7.
 */
export function rollAttribute(actor: CoC7Actor, key: RollableAttribute, event: MouseEvent): void {
	void actor.attributeCheck(key, event.shiftKey);
}

/**
 * Rolls a characteristic through CoC7's own check (dialog and chat card as on the sheet; Shift
 * skips the dialog).
 */
export function rollCharacteristic(actor: CoC7Actor, key: CharacteristicKey, event: MouseEvent): void {
	void actor.characteristicCheck(key, event.shiftKey);
}

/**
 * Rolls a skill through CoC7's own check, the call its skill macros make. The skill is passed
 * by uuid so two skills with the same name can never be confused.
 */
export function rollSkill(actor: CoC7Actor, skillId: string, event: MouseEvent): void {
	const skill = actor.items?.get(skillId);
	if (skill) void actor.skillCheck(skill.uuid, event.shiftKey);
}

/**
 * Attacks with a weapon through CoC7's own flow (target check, then the melee or ranged chat
 * card), the call its weapon macros make.
 */
export function rollWeapon(actor: CoC7Actor, weaponId: string): void {
	void actor.weaponCheck({ id: weaponId });
}

/**
 * Changes the rounds loaded, with the sheet's controls: +1 or -1, Shift+click reloads fully or
 * empties the weapon.
 */
export function changeAmmo(actor: CoC7Actor, weaponId: string, direction: 1 | -1, full: boolean): void {
	const system = actor.items?.get(weaponId)?.system;
	if (!system) return;
	if (direction > 0) void (full ? system.reload() : system.addAmmunition());
	else void (full ? system.setBullets(0) : system.shootAmmunition(1));
}

/** Rolls initiative through the combat, which CoC7 replaces with its own DEX based roll. */
export function rollInitiative(actor: CoC7Actor): void {
	const combatant = findCombatant(actor);
	if (combatant) void game.combat.rollInitiative([combatant.id]);
}

/** Toggles CoC7's "has a readied firearm" flag that the combat tracker shows as a gun icon. */
export function toggleReadiedGun(actor: CoC7Actor): void {
	const combatant = findCombatant(actor);
	if (combatant) void combatant.setFlag(game.system.id, 'hasGun', !combatant.getFlag(game.system.id, 'hasGun'));
}

/**
 * Starts a new day for sanity, as CoC7's rest does: the loss goes back to 0 and the limit is
 * recalculated as one fifth of current Sanity.
 */
export function resetDailySanityLoss(actor: CoC7Actor): void {
	void actor.resetDailySanity();
}

export function openSheet(actor: CoC7Actor): void {
	void actor.sheet?.render(true);
}

/**
 * The NPC sheet's Sanity loss label: a Sanity check card for each targeted token (Ctrl as the
 * Keeper: a check link in chat instead). The handler only reads the sheet's document, so it works
 * with the sheet closed; it relies on internals we cannot import (`CoC7SanCheckCard`, `CoC7Link`).
 */
export function rollSanityLoss(actor: CoC7Actor, event: MouseEvent): void {
	void actor.sheet?._onSanCheck?.(event);
}

/** Opens an owned item's sheet, as the actor sheet's edit button does (`_onItemEdit`). */
export function openItemSheet(actor: CoC7Actor, itemId: string): void {
	void actor.items?.get(itemId)?.sheet?.render({ force: true });
}

// ---------------------------------------------------------------------------
// Subscription
// ---------------------------------------------------------------------------

/** Foundry hooks that can change anything the HUD displays. */
const CORE_HOOKS = [
	'updateActor',
	'createItem',
	'updateItem',
	'deleteItem',
	'createActiveEffect',
	'updateActiveEffect',
	'deleteActiveEffect',
	'controlToken',
	'updateToken',
	'deleteToken',
	'updateUser',
	'canvasReady',
	'createCombat',
	'updateCombat',
	'deleteCombat',
	'createCombatant',
	'updateCombatant',
	'deleteCombatant',
];

/**
 * Calls `listener` (at most once per animation frame) whenever something the HUD shows may
 * have changed. Returns an unsubscribe function.
 */
export function subscribe(listener: () => void): () => void {
	let scheduled = false;
	const schedule = () => {
		if (scheduled) return;
		scheduled = true;
		requestAnimationFrame(() => {
			scheduled = false;
			listener();
		});
	};

	const registered: Array<[string, number]> = CORE_HOOKS.map((name) => [name, Hooks.on(name, schedule)]);
	return () => {
		for (const [name, id] of registered) Hooks.off(name, id);
	};
}
