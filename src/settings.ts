import type { ThemeSource } from './adapter/types.ts';
import { MODULE_ID } from './constants.ts';
import { refreshTheme } from './hud/theme.ts';
import { hudState } from './state/hudState.svelte.ts';

const PREFIX = 'COC7_HUD.settings';

function register(key: string, data: Record<string, unknown>): void {
	game.settings.register(MODULE_ID, key, {
		scope: 'client',
		config: true,
		name: `${PREFIX}.${key}.name`,
		hint: `${PREFIX}.${key}.hint`,
		...data,
	});
}

function toThemeSource(value: unknown): ThemeSource {
	return value === 'applications' ? 'applications' : 'interface';
}

export function registerSettings(): void {
	// Not shown in the settings menu: toggled with the HUD's own tab.
	register('collapsed', { type: Boolean, default: false, config: false });

	register('scale', {
		type: new foundry.data.fields.NumberField({
			min: 0.6,
			max: 1.4,
			step: 0.05,
			initial: 1,
			nullable: false,
		}),
		default: 1,
		onChange: (value: number) => {
			hudState.scale = Number(value) || 1;
		},
	});

	register('themeSource', {
		type: String,
		default: 'interface',
		choices: {
			interface: `${PREFIX}.themeSource.interface`,
			applications: `${PREFIX}.themeSource.applications`,
		},
		onChange: (value: unknown) => {
			hudState.themeSource = toThemeSource(value);
			refreshTheme();
		},
	});

	register('hideMacroBar', {
		type: Boolean,
		default: false,
		onChange: (value: boolean) => {
			hudState.hideMacroBar = Boolean(value);
		},
	});

	register('alwaysHideMacroBar', {
		type: Boolean,
		default: true,
		onChange: (value: boolean) => {
			hudState.alwaysHideMacroBar = Boolean(value);
		},
	});

	register('showForGM', {
		type: Boolean,
		default: true,
		onChange: (value: boolean) => {
			hudState.showForGM = Boolean(value);
		},
	});
}

/** Copies the stored settings into the reactive HUD state. Call once the game is ready. */
export function loadSettings(): void {
	hudState.collapsed = Boolean(game.settings.get(MODULE_ID, 'collapsed'));
	hudState.scale = Number(game.settings.get(MODULE_ID, 'scale')) || 1;
	hudState.themeSource = toThemeSource(game.settings.get(MODULE_ID, 'themeSource'));
	hudState.hideMacroBar = Boolean(game.settings.get(MODULE_ID, 'hideMacroBar'));
	hudState.alwaysHideMacroBar = Boolean(game.settings.get(MODULE_ID, 'alwaysHideMacroBar'));
	hudState.showForGM = Boolean(game.settings.get(MODULE_ID, 'showForGM'));
}

export function setCollapsed(collapsed: boolean): void {
	hudState.collapsed = collapsed;
	void game.settings.set(MODULE_ID, 'collapsed', collapsed);
}

/**
 * Opens Foundry's settings window straight on this module's tab. The tab is given as
 * `{categories: id}`: the plain string form is applied to the window's first tab group, which
 * does not exist yet on the first render.
 */
export function openModuleSettings(): void {
	void game.settings.sheet.render({ force: true, tab: { categories: MODULE_ID } });
}
