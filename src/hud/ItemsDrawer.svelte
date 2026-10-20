<script lang="ts">
	import { openItemSheet, readItemGroups } from '../adapter/systemAdapter.ts';
	import type { ItemListKind } from '../adapter/types.ts';
	import { t, tf, ts } from '../localize.ts';
	import { hudState } from '../state/hudState.svelte.ts';

	interface Props {
		actor: NonNullable<typeof hudState.actor>;
		kind: ItemListKind;
		onOpen: () => void;
	}

	let { actor, kind, onOpen }: Props = $props();

	const EMPTY: Record<ItemListKind, string> = { spells: 'noSpells', talents: 'noTalents', items: 'noItems' };

	const groups = $derived.by(() => {
		void hudState.version;
		return readItemGroups(actor, kind);
	});
	// The inventory shows only the item types the actor has; a single-type list always shows.
	const shown = $derived(groups.length === 1 ? groups : groups.filter((group) => group.items.length > 0));
</script>

<!-- The actor's spells, Pulp talents or inventory under a heading per item type; clicking one opens its sheet, like the sheet's edit button. -->
<div class="items">
	{#if shown.length === 0}
		<h3 class="coc7-hud-heading">{ts('CoC7.Inventory')}</h3>
		<p class="empty">{t(EMPTY[kind])}</p>
	{/if}
	{#each shown as group (group.type)}
		<h3 class="coc7-hud-heading">{group.label}</h3>
		{#if group.items.length === 0}
			<p class="empty">{t(EMPTY[kind])}</p>
		{:else}
			<div class="list">
				{#each group.items as item (item.id)}
					{@const tooltip = tf('openItem', { name: item.name })}
					<button
						type="button"
						class="item"
						data-hud-tooltip={tooltip}
						aria-label={tooltip}
						onclick={() => {
							openItemSheet(actor, item.id);
							onOpen();
						}}
					>
						<img class="img" src={item.img} alt="" draggable="false" />
						<span class="name">{item.name}</span>
					</button>
				{/each}
			</div>
		{/if}
	{/each}
</div>

<style>
	/* One column: actors carry only a few of these. Scrolls when taller than the screen. */
	.items {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		width: min(16rem, 92vw);
		max-height: calc(100vh - 16rem);
		overflow-y: auto;
	}

	.item {
		display: flex;
		align-items: center;
		justify-content: flex-start;
		gap: 0.375rem;
		box-sizing: border-box;
		width: 100%;
		height: auto;
		min-height: 0;
		margin: 0 0 0.125rem;
		padding: 0.125rem 0.375rem;
		cursor: pointer;
		color: var(--hud-text);
		font: inherit;
		font-size: 0.8125rem;
		line-height: 1.3;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 0.25rem;
	}

	.item:hover {
		background: var(--hud-hover);
		border-color: var(--hud-accent);
	}

	.img {
		flex: none;
		width: 1rem;
		height: 1rem;
		object-fit: cover;
		border: none;
		border-radius: 0.125rem;
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-align: start;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.empty {
		margin: 0;
		padding: 0.5rem;
		color: var(--hud-muted);
		font-size: 0.8125rem;
		text-align: center;
	}
</style>
