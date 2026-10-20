<script lang="ts">
	import { matchesSearch } from '../adapter/derive.ts';
	import { readSkills, rollSkill } from '../adapter/systemAdapter.ts';
	import { t, tf, ts } from '../localize.ts';
	import { hudState } from '../state/hudState.svelte.ts';

	interface Props {
		actor: NonNullable<typeof hudState.actor>;
		onRoll: () => void;
	}

	let { actor, onRoll }: Props = $props();

	let query = $state('');
	let search = $state<HTMLInputElement | null>(null);

	const skills = $derived.by(() => {
		void hudState.version;
		return readSkills(actor);
	});
	const shown = $derived(skills.filter((skill) => matchesSearch(skill.name, query)));

	// Ready to type as soon as the drawer opens.
	$effect(() => {
		search?.focus();
	});

	function roll(skillId: string, event: MouseEvent | KeyboardEvent): void {
		rollSkill(actor, skillId, event as MouseEvent);
		onRoll();
	}
</script>

<div class="skills">
	<h3 class="coc7-hud-heading">{ts('CoC7.Skills')}</h3>
	<div class="search-row">
		<i class="fa-solid fa-magnifying-glass"></i>
		<input
			bind:this={search}
			bind:value={query}
			class="search"
			type="search"
			placeholder={t('searchSkills')}
			aria-label={t('searchSkills')}
			onkeydown={(event) => {
				// Enter rolls the skill when the search has narrowed the list to one.
				const only = shown.length === 1 ? shown[0] : undefined;
				if (event.key === 'Enter' && only) roll(only.id, event);
			}}
		/>
	</div>

	{#if shown.length === 0}
		<p class="empty">{t('noSkills')}</p>
	{:else}
		<div class="list">
			{#each shown as skill (skill.id)}
				{@const tooltip = tf('checkTooltip', {
					label: skill.name,
					value: skill.value,
					hard: skill.hard,
					extreme: skill.extreme,
				})}
				<button
					type="button"
					class="skill"
					data-hud-tooltip={tooltip}
					aria-label={tooltip}
					onclick={(event) => roll(skill.id, event)}
				>
					<span class="flag" class:flag--on={skill.flagged}>
						{#if skill.flagged}
							<i class="fa-solid fa-square-check" aria-label={t('flagged')}></i>
						{/if}
					</span>
					<span class="name">{skill.name}</span>
					<span class="value">{skill.value}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.skills {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		width: min(32rem, 92vw);
	}

	.search-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		color: var(--hud-muted);
	}

	.search {
		flex: 1;
		height: 1.75rem;
		padding: 0 0.5rem;
		color: var(--hud-text);
		font: inherit;
		font-size: 0.8125rem;
		background: var(--hud-surface);
		border: 1px solid var(--hud-border);
		border-radius: 0.25rem;
	}

	.search:focus {
		border-color: var(--hud-accent);
		outline: none;
		box-shadow: none;
	}

	.search::placeholder {
		color: var(--hud-muted);
	}

	/*
	 * Two columns filled top to bottom, alphabetical like the sheet. The list grows up to the
	 * screen height left above the HUD bar, then scrolls.
	 */
	.list {
		columns: 2;
		column-gap: 1rem;
		max-height: calc(100vh - 16rem);
		overflow-y: auto;
	}

	.skill {
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
		break-inside: avoid;
		color: var(--hud-text);
		font: inherit;
		font-size: 0.8125rem;
		line-height: 1.3;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 0.25rem;
	}

	.skill:hover {
		background: var(--hud-hover);
		border-color: var(--hud-accent);
	}

	.flag {
		flex: none;
		width: 0.875rem;
		color: var(--hud-accent);
		font-size: 0.75rem;
	}

	.name {
		flex: 1;
		min-width: 0;
		overflow: hidden;
		text-align: start;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.value {
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}


	.empty {
		margin: 0;
		padding: 0.5rem;
		color: var(--hud-muted);
		font-size: 0.8125rem;
		text-align: center;
	}
</style>
