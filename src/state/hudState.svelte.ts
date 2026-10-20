import { getBoundActor } from '../adapter/systemAdapter.ts';
import type { Theme, ThemeSource } from '../adapter/types.ts';

/**
 * HUD state. Foundry documents are not reactive, so components read fresh data inside
 * `$derived` blocks that depend on `version`, and the adapter's hook subscription bumps it
 * whenever something relevant changes.
 */
class HudState {
	/** Bumped on every relevant Foundry change; components depend on it to re-read. */
	version = $state(0);
	/** The bound investigator. Raw: documents are class instances and must not be proxied. */
	actor = $state.raw<ReturnType<typeof getBoundActor>>(null);

	collapsed = $state(false);
	scale = $state(1);
	hideMacroBar = $state(false);
	alwaysHideMacroBar = $state(true);
	showForGM = $state(true);
	/** Which of Foundry's two color schemes the HUD follows. */
	themeSource = $state<ThemeSource>('interface');
	/** The theme currently shown, kept in sync by src/hud/theme.ts. */
	theme = $state<Theme>('dark');

	/** Re-resolve the bound investigator and trigger a re-read in every component. */
	refresh(): void {
		this.actor = getBoundActor();
		this.version += 1;
	}
}

export const hudState = new HudState();
