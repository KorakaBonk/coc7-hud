<script lang="ts">
	import { readCharacteristics, rollCharacteristic } from '../adapter/systemAdapter.ts';
	import { tf, ts } from '../localize.ts';
	import { hudState } from '../state/hudState.svelte.ts';

	interface Props {
		actor: NonNullable<typeof hudState.actor>;
		onRoll: () => void;
	}

	let { actor, onRoll }: Props = $props();

	const characteristics = $derived.by(() => {
		void hudState.version;
		return readCharacteristics(actor);
	});
</script>

<h3 class="coc7-hud-heading">{ts('CoC7.Characteristics')}</h3>
<div class="grid">
	{#each characteristics as entry (entry.key)}
		{@const tooltip = tf('checkTooltip', {
			label: entry.label,
			value: entry.value,
			hard: entry.hard,
			extreme: entry.extreme,
		})}
		<button
			type="button"
			class="entry"
			data-hud-tooltip={tooltip}
			aria-label={tooltip}
			onclick={(event) => {
				rollCharacteristic(actor, entry.key, event);
				onRoll();
			}}
		>
			<span class="short">{entry.short}</span>
			<span class="value">{entry.value}</span>
		</button>
	{/each}
</div>

<style>
	/* Two rows of four, in sheet order. */
	.grid {
		display: grid;
		grid-template-columns: repeat(4, 4.5rem);
		gap: 0.25rem;
	}

	.entry {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.0625rem;
		height: auto;
		min-height: 3.25rem;
		margin: 0;
		padding: 0.375rem;
		cursor: pointer;
		color: var(--hud-text);
		font: inherit;
		line-height: 1.1;
		background: var(--hud-surface);
		border: 1px solid var(--hud-border);
		border-radius: 0.375rem;
	}

	.entry:hover {
		background: var(--hud-hover);
		border-color: var(--hud-accent);
	}


	.short {
		color: var(--hud-muted);
		font-size: 0.6875rem;
		font-weight: 700;
		text-transform: uppercase;
	}

	.value {
		font-size: 1rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}

</style>
