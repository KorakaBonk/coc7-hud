/** View types produced by the adapter. Components only ever see these, never CoC7 documents. */

/** A value with a maximum, shown as a bar (hit points, magic points, sanity, luck). */
export interface MeterView {
	value: number;
	max: number;
	/** 0 to 100, for the bar fill. */
	percent: number;
}

export interface SanityView extends MeterView {
	/** Sanity lost today, and the limit before an indefinite insanity check. */
	dailyLoss: number;
	dailyLimit: number;
}

/** The attributes a bar can edit. */
export type MeterKey = 'hp' | 'mp' | 'san' | 'lck';

/** The attributes the HUD can roll from a bar (CoC7's `actor.attributeCheck`). */
export type RollableAttribute = 'san' | 'lck';

/** Investigators get the full HUD; a Keeper controlling an NPC or creature token gets the same HUD without the investigator-only parts. */
export type ActorKind = 'investigator' | 'npc';

export interface VitalsView {
	kind: ActorKind;
	name: string;
	/** Investigators: archetype, occupation and age, e.g. "Scholar · Antiquarian · 42 years old". NPCs: type, occupation and age. */
	summary: string;
	img: string;
	/** Null when the actor does not use the attribute (an NPC without Sanity or Luck). */
	hp: MeterView | null;
	mp: MeterView | null;
	san: SanityView | null;
	luck: MeterView | null;
	/** Derived attributes as the sheet shows them; null when the actor has none. */
	mov: number | null;
	build: string | null;
	db: string | null;
	armor: string;
	/** NPCs: the Sanity loss for seeing them, e.g. "0/1D6"; null when unset. */
	sanLoss: string | null;
	/** NPCs: attacks per round; null for investigators. */
	attacksPerRound: string | null;
}

/** A check value with its hard (half) and extreme (fifth) targets, as the sheet shows them. */
export interface CheckValues {
	value: number;
	hard: number;
	extreme: number;
}

/** The eight characteristics. */
export type CharacteristicKey = 'str' | 'con' | 'siz' | 'dex' | 'app' | 'int' | 'pow' | 'edu';

export interface CharacteristicView extends CheckValues {
	key: CharacteristicKey;
	/** e.g. "STR". */
	short: string;
	/** e.g. "Strength". */
	label: string;
}

export interface SkillView extends CheckValues {
	id: string;
	name: string;
	/** Ticked for an experience check at the end of the session. */
	flagged: boolean;
}

/** One of a weapon's damage entries (normal, long and extreme range for firearms). */
export interface DamageView {
	/** Which of the weapon's range entries this is. */
	range: 'normal' | 'long' | 'extreme';
	formula: string;
	/** The range distance as written on the weapon, e.g. "15 yards"; empty for melee. */
	distance: string;
}

export interface WeaponView {
	id: string;
	name: string;
	img: string;
	ranged: boolean;
	/** Null when the weapon has no skill set on this actor (the sheet then cannot roll it). */
	skill: (CheckValues & { name: string }) | null;
	damages: DamageView[];
	/** Adds full or half damage bonus (melee and thrown weapons). */
	damageBonus: 'full' | 'half' | null;
	/** Rounds loaded and magazine size; null for weapons that use no ammunition. */
	ammo: { current: number; max: number } | null;
}

/** A combat skill without a weapon (Fighting, Firearms, Throw, Dodge). */
export interface CombatSkillView extends CheckValues {
	id: string;
	name: string;
}

/** The bound actor's place in the current combat, or null when it is not in one. */
export interface InitiativeView {
	combatantId: string;
	/** Null until rolled. */
	initiative: number | null;
	/** CoC7's "has a readied firearm" flag: +50 DEX, or a bonus die under the optional rule. */
	hasGun: boolean;
}

/** The side slots' item lists: spells, Pulp talents, and the inventory (items, books and armor). */
export type ItemListKind = 'spells' | 'talents' | 'items';

/** An item the HUD only lists; clicking it opens the item's sheet. */
export interface ItemView {
	id: string;
	name: string;
	img: string;
}

/** One headed list in an item drawer, e.g. the books in the inventory. */
export interface ItemGroupView {
	/** The item type, e.g. `book`. */
	type: string;
	/** The heading, e.g. "Books". */
	label: string;
	items: ItemView[];
}

export interface ConditionView {
	id: string;
	name: string;
	img: string;
	/** Dead: shown over the whole portrait, as the sheet does, instead of as a small icon. */
	dead: boolean;
}

/** Which Foundry color scheme the HUD follows. */
export type ThemeSource = 'interface' | 'applications';
export type Theme = 'light' | 'dark';
