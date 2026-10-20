/** Pure helpers used by the adapter. No Foundry globals here, so they can be unit tested. */

import type { Theme } from './types.ts';

/** Fill percentage of a bar, 0 to 100. */
export function clampPercent(value: number, max: number): number {
	if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
	return Math.min(100, Math.max(0, Math.round((value / max) * 100)));
}

/** The hard (half) and extreme (fifth) targets of a check, rounded down like the sheet. */
export function checkValues(value: number): { value: number; hard: number; extreme: number } {
	const regular = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
	return { value: regular, hard: Math.floor(regular / 2), extreme: Math.floor(regular / 5) };
}

/**
 * Whether a skill matches the search text: every word of the query must appear in the name,
 * in any order, ignoring case and accents ("art craft" finds "Art/Craft (Photography)").
 */
export function matchesSearch(name: string, query: string): boolean {
	const fold = (text: string) =>
		text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase();
	const haystack = fold(name);
	return fold(query)
		.split(/\s+/)
		.filter((word) => word.length > 0)
		.every((word) => haystack.includes(word));
}

/** A whole number between 0 and max, or null when the input is not a number. */
export function clampMeter(value: number, max: number): number | null {
	const number = Math.floor(Number(value));
	if (!Number.isFinite(number)) return null;
	const upper = Number.isFinite(max) && max > 0 ? max : Number.POSITIVE_INFINITY;
	return Math.min(upper, Math.max(0, number));
}

/** A numeric attribute, treating null, undefined and non-numbers as 0. */
export function toNumber(value: unknown): number {
	const number = Number(value);
	return Number.isFinite(number) ? number : 0;
}

/** A derived attribute as text, or null when it is unset (CoC7 stores some as strings). */
export function toLabel(value: unknown): string | null {
	if (value === null || value === undefined) return null;
	const text = String(value).trim();
	return text.length > 0 ? text : null;
}

/** Whether text is a plain whole number such as "42" (CoC7 stores age as free text). */
export function isWholeNumber(text: string): boolean {
	return /^\d+$/.test(text.trim());
}

/** Joins the non-empty parts with a middle dot, e.g. "Antiquarian · 42". */
export function joinSummary(parts: (string | null | undefined)[]): string {
	return parts
		.map((part) => (part ?? '').trim())
		.filter((part) => part.length > 0)
		.join(' · ');
}

/**
 * The theme to show, from the classes Foundry puts on <body> (applications scheme) and on
 * #interface (interface scheme). Foundry adds `theme-light` or `theme-dark`; when neither is
 * there (no browser preference and no setting) the HUD stays dark.
 */
export function resolveTheme(classes: Iterable<string>): Theme {
	for (const name of classes) {
		if (name === 'theme-light') return 'light';
		if (name === 'theme-dark') return 'dark';
	}
	return 'dark';
}

/**
 * Positions for `count` square icons walked clockwise around the inside edge of a box,
 * starting at the bottom-left corner and going up the left side. Used to lay condition icons
 * over the portrait.
 */
export function perimeterSlots(
	count: number,
	width: number,
	height: number,
	size: number,
	gap: number,
	padding: number,
): { left: number; top: number }[] {
	const spanX = Math.max(0, width - 2 * padding - size);
	const spanY = Math.max(0, height - 2 * padding - size);
	const perimeter = 2 * (spanX + spanY);
	const step = size + gap;

	return Array.from({ length: count }, (_, index) => {
		let distance = perimeter > 0 ? (index * step) % perimeter : 0;
		let left = padding;
		let top = padding + spanY;

		// Left edge, going up.
		const up = Math.min(distance, spanY);
		top -= up;
		distance -= up;
		// Top edge, going right.
		const right = Math.min(distance, spanX);
		left += right;
		distance -= right;
		// Right edge, going down.
		const down = Math.min(distance, spanY);
		top += down;
		distance -= down;
		// Bottom edge, going left.
		left -= Math.min(distance, spanX);

		return { left, top };
	});
}
