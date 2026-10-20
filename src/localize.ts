/** Localizes a key under the COC7_HUD namespace, e.g. t('openSheet') -> "Open character sheet". */
export function t(key: string): string {
	return game.i18n.localize(`COC7_HUD.${key}`);
}

/** Like `t`, but fills `{placeholder}` slots from `data`. */
export function tf(key: string, data: Record<string, string | number>): string {
	return game.i18n.format(`COC7_HUD.${key}`, data);
}

/**
 * Localizes a key owned by the CoC7 system itself (e.g. `CoC7.HP`).
 * Only for wording that must stay identical to the character sheet; HUD-only text uses `t`.
 */
export function ts(key: string, data?: Record<string, string | number>): string {
	return data ? game.i18n.format(key, data) : game.i18n.localize(key);
}

/**
 * Like `ts`, for system keys that some CoC7 languages leave untranslated (German has no
 * `CoC7.RollDamageRange`, for example). When the current language lacks the system key, the HUD's own
 * key is used instead of Foundry's English fallback.
 */
export function tsOr(key: string, hudKey: string, data?: Record<string, string | number>): string {
	if (game.i18n.has(key, false)) return ts(key, data);
	return data ? tf(hudKey, data) : t(hudKey);
}
