<script lang="ts">
	import { readItemGroups } from '../adapter/systemAdapter.ts';
	import type { ItemListKind } from '../adapter/types.ts';
	import { ts } from '../localize.ts';
	import { hudState } from '../state/hudState.svelte.ts';

	interface Props {
		actor: NonNullable<typeof hudState.actor>;
		/** The open drawer, to mark the list button that opened it. */
		drawer: string | null;
		onToggleDrawer: (name: ItemListKind) => void;
	}

	let { actor, drawer, onToggleDrawer }: Props = $props();

	// Spells, Pulp talents and inventory, for investigators and NPCs alike.
	const LISTS: { name: ItemListKind; icon: string; label: string }[] = [
		{ name: 'spells', icon: 'fa-hat-wizard', label: 'CoC7.Spells' },
		{ name: 'talents', icon: 'fa-star', label: 'CoC7.PulpTalents' },
		{ name: 'items', icon: 'fa-backpack', label: 'CoC7.Inventory' },
	];

	const counts = $derived.by(() => {
		void hudState.version;
		const count = (kind: ItemListKind) =>
			readItemGroups(actor, kind).reduce((total, group) => total + group.items.length, 0);
		return { spells: count('spells'), talents: count('talents'), items: count('items') };
	});
</script>

<!--
	One column of three slots, sized like the drawer buttons, on the bar's right side: Spells,
	Pulp Talents and Inventory.
-->
<div class="checks">
	{#each LISTS as list (list.name)}
		<button
			type="button"
			class="check hud-drawer-toggle"
			class:active={drawer === list.name}
			aria-pressed={drawer === list.name}
			data-hud-tooltip={ts(list.label)}
			aria-label={ts(list.label)}
			onclick={() => onToggleDrawer(list.name)}
		>
			<i class="fa-solid {list.icon}"></i>
			<span class="value">{counts[list.name]}</span>
		</button>
	{/each}
</div>

<style>
	/* Three rows of the HUD's row height, like the vitals and the drawer buttons. */
	.checks {
		display: grid;
		grid-template-rows: repeat(3, var(--hud-row-height));
		grid-auto-columns: var(--hud-button-width);
		align-content: center;
		gap: var(--hud-row-gap);
	}

	.check {
		box-sizing: border-box;
		width: var(--hud-button-width);
		height: var(--hud-row-height);
	}

	/* The size of a drawer button: the short name over the value. */
	.check {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.0625rem;
		min-height: 0;
		margin: 0;
		padding: 0;
		cursor: pointer;
		color: var(--hud-text);
		font: inherit;
		line-height: 1;
		background: var(--hud-surface);
		border: 1px solid var(--hud-border);
		border-radius: 0.375rem;
	}

	.check:hover {
		background: var(--hud-hover);
		border-color: var(--hud-accent);
	}

	.check.active {
		color: var(--hud-accent);
		border-color: var(--hud-accent);
	}

	.check i {
		margin: 0;
		font-size: 0.875rem;
	}

	.label {
		color: var(--hud-muted);
		font-size: 0.5625rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.value {
		font-size: 0.8125rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
</style>
