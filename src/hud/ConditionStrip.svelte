<script lang="ts">
	import { perimeterSlots } from '../adapter/derive.ts';
	import type { ConditionView } from '../adapter/types.ts';
	import { t } from '../localize.ts';

	interface Props {
		conditions: ConditionView[];
		/** Size of the box the icons are overlaid on, in px. */
		width: number;
		height: number;
	}

	const SIZE = 20;
	const GAP = 4;
	const PADDING = 4;

	let { conditions, width, height }: Props = $props();

	/**
	 * Condition icons are paths relative to the Foundry root. A url() inside a CSS variable is
	 * resolved against the stylesheet, not the page, so hand it an absolute URL.
	 */
	function maskUrl(path: string): string {
		return `url("${new URL(path, document.baseURI).href}")`;
	}

	// Dead covers the whole portrait, as on the sheet; the rest go round its edge.
	const dead = $derived(conditions.find((condition) => condition.dead));
	const small = $derived(conditions.filter((condition) => !condition.dead));
	const slots = $derived(perimeterSlots(small.length, width, height, SIZE, GAP, PADDING));
</script>

<div class="conditions" aria-label={t('conditions')}>
	{#if dead}
		<span
			class="dead"
			class:dead--blank={!dead.img}
			role="img"
			aria-label={dead.name}
			style:--icon={dead.img ? maskUrl(dead.img) : undefined}
		>
			{#if !dead.img}<i class="fa-solid fa-skull"></i>{/if}
		</span>
	{/if}
	{#each small as condition, index (condition.id)}
		<span
			class="icon"
			class:icon--blank={!condition.img}
			role="img"
			aria-label={condition.name}
			data-hud-tooltip={condition.name}
			style:left="{slots[index]?.left}px"
			style:top="{slots[index]?.top}px"
			style:--icon={condition.img ? maskUrl(condition.img) : undefined}
		></span>
	{/each}
</div>

<style>
	/* Overlay on the portrait; only the icons themselves take pointer events. */
	.conditions {
		position: absolute;
		inset: 0;
		pointer-events: none;
	}

	/* A solid silhouette of the condition icon, whatever color the source image has. */
	.icon {
		position: absolute;
		pointer-events: auto;
		width: 1.25rem;
		height: 1.25rem;
		background: var(--hud-condition-bg);
		border: 1px solid var(--hud-border);
		border-radius: 0.25rem;
	}

	.icon::before {
		content: '';
		position: absolute;
		inset: 2px;
		background-color: var(--hud-condition-icon);
		mask: var(--icon) center / contain no-repeat;
	}

	/*
	 * Dead: the icon over the whole portrait, no border or background. It lets clicks through to
	 * the portrait, which opens the sheet.
	 */
	.dead {
		position: absolute;
		inset: 0.5rem;
		background-color: var(--hud-condition-icon);
		mask: var(--icon) center / contain no-repeat;
	}

	/* Without an icon, Font Awesome's skull stands in. */
	.dead--blank {
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--hud-condition-icon);
		font-size: 3rem;
		background: none;
		mask: none;
	}

	/* A condition without an icon shows as a plain dot. */
	.icon--blank::before {
		inset: 6px;
		border-radius: 50%;
		mask: none;
	}
</style>
