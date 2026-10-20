<script lang="ts">
	import {
		actorKind,
		changeMeter,
		openSheet,
		readConditions,
		readVitals,
		resetDailySanityLoss,
		rollAttribute,
		rollSanityLoss,
		setMeter,
	} from '../adapter/systemAdapter.ts';
	import type { ItemListKind } from '../adapter/types.ts';
	import { BODY_OPEN_CLASS, DOCK_GAP_PX, MODULE_ID } from '../constants.ts';
	import { t, ts } from '../localize.ts';
	import { openModuleSettings, setCollapsed } from '../settings.ts';
	import { hudState } from '../state/hudState.svelte.ts';
	import CharacteristicsDrawer from './CharacteristicsDrawer.svelte';
	import CombatDrawer from './CombatDrawer.svelte';
	import ItemsDrawer from './ItemsDrawer.svelte';
	import SideSlots from './SideSlots.svelte';
	import SkillsDrawer from './SkillsDrawer.svelte';
	import VitalsBlock from './VitalsBlock.svelte';

	const actor = $derived(hudState.actor);
	// An NPC or creature only ever binds for the Keeper, who always gets its HUD; the setting is
	// about the Keeper seeing investigators.
	const visible = $derived(
		actor !== null && (actorKind(actor) === 'npc' || !game.user.isGM || hudState.showForGM),
	);

	const vitals = $derived.by(() => {
		void hudState.version;
		return actor ? readVitals(actor) : null;
	});
	const conditions = $derived.by(() => {
		void hudState.version;
		return actor ? readConditions(actor) : [];
	});

	// Spells, talents and inventory are opened from the side slots.
	type DrawerName = 'characteristics' | 'skills' | 'combat' | ItemListKind;

	function isItemList(name: DrawerName | null): name is ItemListKind {
		return name === 'spells' || name === 'talents' || name === 'items';
	}

	const DRAWER_BUTTONS: { name: 'characteristics' | 'skills' | 'combat'; icon: string; label: string }[] = [
		{ name: 'characteristics', icon: 'fa-dice-d20', label: 'CoC7.Characteristics' },
		{ name: 'skills', icon: 'fa-list-check', label: 'CoC7.Skills' },
		{ name: 'combat', icon: 'fa-swords', label: 'CoC7.Combat' },
	];

	let drawer = $state<DrawerName | null>(null);

	function toggleDrawer(name: DrawerName): void {
		drawer = drawer === name ? null : name;
	}

	// Close the drawer on Escape or on a click anywhere outside it and its buttons.
	$effect(() => {
		if (!drawer) return;
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Element | null;
			if (!target?.closest('.hud-drawer, .hud-buttons, .hud-drawer-toggle')) drawer = null;
		};
		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') drawer = null;
		};
		document.addEventListener('pointerdown', onPointerDown);
		document.addEventListener('keydown', onKeyDown);
		return () => {
			document.removeEventListener('pointerdown', onPointerDown);
			document.removeEventListener('keydown', onKeyDown);
		};
	});

	async function confirmResetDailySanity(): Promise<void> {
		if (!actor) return;
		const confirmed = await foundry.applications.api.DialogV2.confirm({
			window: { title: t('resetDailySanityTitle') },
			content: `<p>${t('resetDailySanityBody')}</p>`,
			rejectClose: false,
		});
		if (confirmed) resetDailySanityLoss(actor);
	}

	// The theme tokens live on the root element (see styles/global.css), so the tooltip, which is
	// a sibling of the HUD, follows the theme too.
	$effect(() => {
		const root = document.getElementById(`${MODULE_ID}-root`);
		root?.classList.toggle('coc7-hud--light', hudState.theme === 'light');
	});

	// While collapsed, the "Show HUD" tab docks to the right of Foundry's macro bar (when that is
	// visible) instead of sitting at the bottom center where the two would overlap.
	let dock = $state<{ left: number; top: number } | null>(null);

	$effect(() => {
		if (!hudState.collapsed) {
			dock = null;
			return;
		}

		const measure = () => {
			const bar = document.getElementById('hotbar');
			const rect = bar && getComputedStyle(bar).display !== 'none' ? bar.getBoundingClientRect() : null;
			dock =
				rect && rect.width > 0 && rect.height > 0
					? { left: rect.right + DOCK_GAP_PX, top: rect.top + rect.height / 2 }
					: null;
		};
		measure();

		const bar = document.getElementById('hotbar');
		const resize = new ResizeObserver(measure);
		if (bar) resize.observe(bar);
		// The macro bar can be hidden by our own body class or minimized by Foundry.
		const mutations = new MutationObserver(measure);
		mutations.observe(document.body, { attributes: true, attributeFilter: ['class'] });
		if (bar) mutations.observe(bar, { attributes: true, attributeFilter: ['class', 'style'] });
		window.addEventListener('resize', measure);

		return () => {
			resize.disconnect();
			mutations.disconnect();
			window.removeEventListener('resize', measure);
		};
	});

	// Hide the macro bar while the full HUD is showing, or always if that setting is on.
	$effect(() => {
		const open =
			hudState.alwaysHideMacroBar || (visible && !hudState.collapsed && hudState.hideMacroBar);
		document.body.classList.toggle(BODY_OPEN_CLASS, open);
		return () => document.body.classList.remove(BODY_OPEN_CLASS);
	});
</script>

{#if visible && actor && vitals}
	<!-- `faded-ui` is Foundry's own class for the Interface Fade setting (opacity and speed). -->
	<div
		class="hud faded-ui"
		class:hud--active={drawer !== null}
		class:hud--collapsed={hudState.collapsed}
		class:hud--docked={hudState.collapsed && dock}
		style:--hud-scale={hudState.scale}
	>
		{#if hudState.collapsed}
			<button
				type="button"
				class="hud-tab"
				class:hud-tab--docked={dock}
				style:left={dock ? `${dock.left}px` : undefined}
				style:top={dock ? `${dock.top}px` : undefined}
				data-hud-tooltip={t('expand')}
				aria-label={t('expand')}
				onclick={() => setCollapsed(false)}
			>
				<i class="fa-solid fa-chevron-up"></i>
				<span>{t('openHud')}</span>
			</button>
		{:else}
			{#if drawer}
				<div class="hud-drawer" class:hud-drawer--right={isItemList(drawer)}>
					{#if drawer === 'characteristics'}
						<CharacteristicsDrawer {actor} onRoll={() => (drawer = null)} />
					{:else if drawer === 'skills'}
						<SkillsDrawer {actor} onRoll={() => (drawer = null)} />
					{:else if isItemList(drawer)}
						<ItemsDrawer {actor} kind={drawer} onOpen={() => (drawer = null)} />
					{:else}
						<CombatDrawer {actor} onRoll={() => (drawer = null)} />
					{/if}
				</div>
			{/if}

			<div class="hud-bar">
				<VitalsBlock
					{vitals}
					{conditions}
					onOpenSheet={() => openSheet(actor)}
					onSetMeter={(key, value) => setMeter(actor, key, value)}
					onChangeMeter={(key, delta) => changeMeter(actor, key, delta)}
					onRoll={(key, event) => rollAttribute(actor, key, event)}
					onResetDailySanity={confirmResetDailySanity}
					onRollSanityLoss={(event) => rollSanityLoss(actor, event)}
				>
					<div class="hud-buttons">
						{#each DRAWER_BUTTONS as button (button.name)}
							<button
								type="button"
								class="hud-button"
								class:active={drawer === button.name}
								aria-pressed={drawer === button.name}
								aria-label={ts(button.label)}
								data-hud-tooltip={ts(button.label)}
								onclick={() => toggleDrawer(button.name)}
							>
								<i class="fa-solid {button.icon}"></i>
							</button>
						{/each}
					</div>
				</VitalsBlock>

				<SideSlots {actor} {drawer} onToggleDrawer={toggleDrawer} />

				<button
					type="button"
					class="hud-collapse hud-settings"
					data-hud-tooltip={t('openSettings')}
					aria-label={t('openSettings')}
					onclick={openModuleSettings}
				>
					<i class="fa-solid fa-gears"></i>
				</button>

				<button
					type="button"
					class="hud-collapse"
					data-hud-tooltip={t('collapse')}
					aria-label={t('collapse')}
					onclick={() => setCollapsed(true)}
				>
					<i class="fa-solid fa-chevron-down"></i>
				</button>
			</div>
		{/if}
	</div>
{/if}

<style>
	.hud {
		/* Full-size row height; the vitals rows are measured against it. */
		--hud-row-height: 2.25rem;
		--hud-row-gap: 0.375rem;
		/* Width of the drawer buttons and the side slots. */
		--hud-button-width: 2.75rem;
		/* Height of every tab sticking out above the bar (settings, collapse). */
		--hud-tab-height: 1.75rem;

		display: flex;
		flex-direction: column;
		align-items: stretch;
		/* Space between an open drawer and the bar (its tabs). */
		gap: 1rem;
		margin-bottom: 0.5rem;
		color: var(--hud-text);
		font-family: var(--font-body, 'Signika', sans-serif);
		transform: scale(var(--hud-scale, 1));
		transform-origin: bottom center;
	}

	/* Like Foundry's chat notifications: fully visible while in use, even without the pointer on it. */
	.hud--active,
	.hud:focus-within {
		--ui-fade-opacity: 1;
	}

	.hud--collapsed {
		margin-bottom: 0;
	}

	/* A transform would make this the containing block of the fixed, docked tab. */
	.hud--docked {
		transform: none;
	}

	/* The top margin makes room for the tabs above the bar. */
	.hud-bar {
		position: relative;
		display: flex;
		margin-top: calc(var(--hud-tab-height) - 0.25rem);
		align-items: stretch;
		gap: 0.75rem;
		padding: 0.5rem 0.625rem;
		pointer-events: auto;
		background: var(--hud-bg);
		border: 1px solid var(--hud-border);
		border-radius: 0.5rem;
		box-shadow: var(--hud-shadow);
		/* Keeps the tentacles below between the bar's background and the portrait. */
		isolation: isolate;
	}

	/* Light theme: the sheet's tentacles inside the bar's left end, partly behind the portrait. */
	.hud-bar::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: 15rem;
		pointer-events: none;
		/* One and a half times the bar's height, cut off at the bar's bottom edge. */
		background: var(--hud-tentacles) left top / auto 150% no-repeat;
		border-radius: inherit;
	}

	/* Drawers open above the bar's left edge. */
	.hud-drawer {
		align-self: flex-start;
		max-width: min(56rem, 96vw);
		padding: 0.5rem 0.75rem;
		pointer-events: auto;
		background: var(--hud-bg);
		border: 1px solid var(--hud-border);
		border-radius: 0.5rem;
		box-shadow: var(--hud-shadow);
	}

	/* The Spells, Talents and Inventory drawers open above the side slots that open them, on the right. */
	.hud-drawer--right {
		align-self: flex-end;
	}

	/* The drawer buttons sit directly right of the portrait. */
	.hud-buttons {
		display: flex;
		flex-direction: column;
		justify-content: center;
		gap: var(--hud-row-gap);
	}

	.hud-button {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: var(--hud-button-width);
		height: var(--hud-row-height);
		margin: 0;
		padding: 0;
		cursor: pointer;
		color: var(--hud-text);
		font: inherit;
		background: var(--hud-surface);
		border: 1px solid var(--hud-border);
		border-radius: 0.375rem;
	}

	.hud-button:hover {
		background: var(--hud-hover);
	}

	.hud-button.active {
		color: var(--hud-accent);
		border-color: var(--hud-accent);
	}

	.hud-tab,
	.hud-collapse {
		pointer-events: auto;
		cursor: pointer;
		color: var(--hud-text);
		background: var(--hud-bg);
		border: 1px solid var(--hud-border);
		border-radius: 0.375rem;
		font: inherit;
		line-height: 1.2;
	}

	/* A small tab sticking out above the bar's upper-right corner, clear of the bar's content. */
	.hud-collapse {
		position: absolute;
		right: 0.75rem;
		bottom: 100%;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: 2rem;
		height: var(--hud-tab-height);
		padding: 0;
		font-size: 0.75rem;
		border-bottom: none;
		border-radius: 0.375rem 0.375rem 0 0;
	}

	/* The settings tab sits beside the collapse tab, to its left. */
	.hud-settings {
		right: 3rem;
	}

	/* Keep the tab's own background under the hover tint. */
	.hud-collapse:hover,
	.hud-tab:hover {
		background: linear-gradient(var(--hud-hover), var(--hud-hover)), var(--hud-bg);
	}

	.hud-tab {
		align-self: center;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		width: auto;
		padding: 0.25rem 0.875rem;
		border-radius: 0.5rem 0.5rem 0 0;
		margin-bottom: 0;
	}

	/* Beside the macro bar, vertically centered on it. */
	.hud-tab--docked {
		position: fixed;
		transform: translateY(-50%);
		border-radius: 0.5rem;
	}
</style>
