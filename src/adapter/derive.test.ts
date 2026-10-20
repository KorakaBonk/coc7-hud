import { describe, expect, it } from 'vitest';
import {
	checkValues,
	clampMeter,
	clampPercent,
	isWholeNumber,
	joinSummary,
	matchesSearch,
	perimeterSlots,
	resolveTheme,
	toLabel,
	toNumber,
} from './derive.ts';

describe('clampPercent', () => {
	it('rounds and clamps', () => {
		expect(clampPercent(5, 10)).toBe(50);
		expect(clampPercent(-3, 10)).toBe(0);
		expect(clampPercent(15, 10)).toBe(100);
	});
	it('returns 0 for a zero or invalid max', () => {
		expect(clampPercent(5, 0)).toBe(0);
		expect(clampPercent(5, Number.NaN)).toBe(0);
	});
});

describe('clampMeter', () => {
	it('clamps to 0..max and drops fractions', () => {
		expect(clampMeter(12.7, 10)).toBe(10);
		expect(clampMeter(-2, 10)).toBe(0);
		expect(clampMeter(7.9, 10)).toBe(7);
	});
	it('has no upper bound when max is unset', () => {
		expect(clampMeter(40, 0)).toBe(40);
	});
	it('returns null for non-numbers', () => {
		expect(clampMeter(Number.NaN, 10)).toBeNull();
	});
});

describe('toNumber and toLabel', () => {
	it('treats empty values as 0 or null', () => {
		expect(toNumber(null)).toBe(0);
		expect(toNumber('12')).toBe(12);
		expect(toLabel(null)).toBeNull();
		expect(toLabel('  ')).toBeNull();
		expect(toLabel('+1D4')).toBe('+1D4');
		expect(toLabel(0)).toBe('0');
	});
});

describe('joinSummary', () => {
	it('skips empty parts', () => {
		expect(joinSummary(['Antiquarian', '', '42'])).toBe('Antiquarian · 42');
		expect(joinSummary([undefined, null])).toBe('');
	});
});

describe('isWholeNumber', () => {
	it('accepts plain ages only', () => {
		expect(isWholeNumber('42')).toBe(true);
		expect(isWholeNumber(' 42 ')).toBe(true);
		expect(isWholeNumber('about 40')).toBe(false);
		expect(isWholeNumber('4.5')).toBe(false);
	});
});

describe('checkValues', () => {
	it('halves and fifths, rounding down', () => {
		expect(checkValues(65)).toEqual({ value: 65, hard: 32, extreme: 13 });
		expect(checkValues(Number.NaN)).toEqual({ value: 0, hard: 0, extreme: 0 });
	});
});

describe('matchesSearch', () => {
	it('matches every word in any order, ignoring case and accents', () => {
		expect(matchesSearch('Art/Craft (Photography)', 'photo art')).toBe(true);
		expect(matchesSearch('Spot Hidden', 'SPOT')).toBe(true);
		expect(matchesSearch('Économie', 'econ')).toBe(true);
		expect(matchesSearch('Spot Hidden', 'listen')).toBe(false);
		expect(matchesSearch('Dodge', '  ')).toBe(true);
	});
});

describe('resolveTheme', () => {
	it('reads Foundry theme classes', () => {
		expect(resolveTheme(['themed', 'theme-light'])).toBe('light');
		expect(resolveTheme(['theme-dark'])).toBe('dark');
	});
	it('defaults to dark', () => {
		expect(resolveTheme(['vtt', 'game'])).toBe('dark');
	});
});

describe('perimeterSlots', () => {
	// 100x60 box, 10px icons, no gap, 5px padding: icon origins span x 5..85, y 5..45.
	it('starts in the lower left corner and goes clockwise', () => {
		const slots = perimeterSlots(6, 100, 60, 10, 0, 5);
		expect(slots[0]).toEqual({ left: 5, top: 45 });
		expect(slots[1]).toEqual({ left: 5, top: 35 });
		expect(slots[4]).toEqual({ left: 5, top: 5 });
		expect(slots[5]).toEqual({ left: 15, top: 5 });
	});
});
