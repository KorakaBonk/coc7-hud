import { resolveTheme } from '../adapter/derive.ts';
import { hudState } from '../state/hudState.svelte.ts';

/**
 * Keeps `hudState.theme` in step with Foundry's color scheme setting.
 *
 * Foundry has two schemes (Configure Settings > Core > User Interface): "Applications" puts
 * `theme-light` / `theme-dark` on <body>, "Interface" puts them on #interface, where the HUD
 * lives. Both are also set from the browser's preference when the setting is left on default.
 * Watching the classes (instead of reading the setting) picks up all of that, and the change
 * applies the moment the user saves the setting.
 */
export function installThemeWatcher(): () => void {
	const observer = new MutationObserver(refreshTheme);
	observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });
	const iface = document.getElementById('interface');
	if (iface) observer.observe(iface, { attributes: true, attributeFilter: ['class'] });
	refreshTheme();
	return () => observer.disconnect();
}

/** Reads the theme from the element the chosen scheme is applied to. */
export function refreshTheme(): void {
	const element =
		hudState.themeSource === 'applications' ? document.body : document.getElementById('interface');
	hudState.theme = resolveTheme((element ?? document.body).classList);
}
