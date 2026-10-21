<script lang="ts">
	import {
		changeAmmo,
		readCombatSkills,
		readInitiative,
		readWeapons,
		rollInitiative,
		rollSkill,
		rollWeapon,
		toggleReadiedGun,
	} from '../adapter/systemAdapter.ts';
	import type { WeaponView } from '../adapter/types.ts';
	import { t, tf, ts, tsOr } from '../localize.ts';
	import { hudState } from '../state/hudState.svelte.ts';

	interface Props {
		actor: NonNullable<typeof hudState.actor>;
		onRoll: () => void;
	}

	let { actor, onRoll }: Props = $props();

	const weapons = $derived.by(() => {
		void hudState.version;
		return readWeapons(actor);
	});
	const melee = $derived(weapons.filter((weapon) => !weapon.ranged));
	const ranged = $derived(weapons.filter((weapon) => weapon.ranged));
	const skills = $derived.by(() => {
		void hudState.version;
		return readCombatSkills(actor);
	});
	const initiative = $derived.by(() => {
		void hudState.version;
		return readInitiative(actor);
	});

	/** e.g. "1D10 (Range 15 yards), 1D10/2 (Range 30 yards)" or "1D6 +DB". */
	function damageText(weapon: WeaponView): string {
		const entries = weapon.damages.map((damage) =>
			damage.distance ? `${damage.formula} (${tsOr('CoC7.RollDamageRange', 'damageRange', { range: damage.distance })})` : damage.formula,
		);
		const bonus = weapon.damageBonus
			? ` ${ts(weapon.damageBonus === 'full' ? 'CoC7.WeaponAddDb' : 'CoC7.WeaponAddHalfDb')}`
			: '';
		return entries.length > 0 ? `${entries.join(', ')}${bonus}` : '';
	}

	/** The attack check with its hard and extreme values, then the damage. */
	function attackTooltip(weapon: WeaponView): string {
		const attack = weapon.skill
			? tf('attackTooltip', {
					skill: weapon.skill.name,
					value: weapon.skill.value,
					hard: weapon.skill.hard,
					extreme: weapon.skill.extreme,
				})
			: ts('CoC7.NoSkill');
		const damage = damageText(weapon);
		return damage ? `${attack}. ${tf('damageTooltip', { damage })}` : attack;
	}
</script>

{#snippet weaponRow(weapon: WeaponView)}
	{@const tooltip = attackTooltip(weapon)}
	{@const attack = () => {
		rollWeapon(actor, weapon.id);
		onRoll();
	}}
	<!-- One row: image and name, ammo, then the attack value. Everything but the ammo attacks. -->
	<li class="row" class:row--disabled={!weapon.skill} data-hud-tooltip={tooltip}>
		<button
			type="button"
			class="attack"
			disabled={!weapon.skill}
			aria-label={tooltip}
			onclick={attack}
		>
			<img class="img" src={weapon.img} alt="" draggable="false" />
			<span class="name">{weapon.name}</span>
		</button>

		{#if weapon.ammo}
			{@const ammo = weapon.ammo}
			<button
				type="button"
				class="ammo"
				class:ammo--empty={ammo.current === 0}
				data-hud-tooltip={t('ammoTooltip')}
				aria-label="{t('ammo')} {ammo.current}/{ammo.max}"
				onclick={(event) => changeAmmo(actor, weapon.id, 1, event.shiftKey)}
				oncontextmenu={(event) => {
					event.preventDefault();
					changeAmmo(actor, weapon.id, -1, event.shiftKey);
				}}
			>
				<i class="fa-solid fa-gun"></i>
				{ammo.current}/{ammo.max}
			</button>
		{/if}

		{#if weapon.skill}
			<button type="button" class="attack attack--value" tabindex="-1" aria-hidden="true" onclick={attack}>
				<span class="value">{weapon.skill.value}</span>
			</button>
		{/if}
	</li>
{/snippet}

<div class="combat">
	{#if initiative}
		<div class="initiative">
			<button
				type="button"
				class="pill"
				data-hud-tooltip={t('rollInitiative')}
				aria-label={t('rollInitiative')}
				onclick={() => rollInitiative(actor)}
			>
				<i class="fa-solid fa-bolt"></i>
				{t('initiative')}
				{#if initiative.initiative !== null}
					<strong>{initiative.initiative}</strong>
				{/if}
			</button>
			<button
				type="button"
				class="pill"
				class:pill--on={initiative.hasGun}
				aria-pressed={initiative.hasGun}
				data-hud-tooltip={t('readiedGunTooltip')}
				aria-label={t('readiedGun')}
				onclick={() => toggleReadiedGun(actor)}
			>
				<i class="fa-solid fa-gun"></i>
				{t('readiedGun')}
			</button>
		</div>
	{/if}

	<h3 class="coc7-hud-heading">{t('combatSkills')}</h3>
	<ul class="list">
		{#each skills as skill (skill.id)}
			{@const tooltip = tf('checkTooltip', {
				label: skill.name,
				value: skill.value,
				hard: skill.hard,
				extreme: skill.extreme,
			})}
			<li class="row" data-hud-tooltip={tooltip}>
				<button
					type="button"
					class="attack"
					aria-label={tooltip}
					onclick={(event) => {
						rollSkill(actor, skill.id, event);
						onRoll();
					}}
				>
					<span class="flag">
						{#if skill.flagged}
							<i class="fa-solid fa-square-check" aria-label={t('flagged')}></i>
						{/if}
					</span>
					<span class="name">{skill.name}</span>
					<span class="value">{skill.value}</span>
				</button>
			</li>
		{/each}
	</ul>

	<h3 class="coc7-hud-heading">{ts('CoC7.MeleeWeapons')}</h3>
	{#if melee.length === 0}
		<p class="empty">{t('noWeapons')}</p>
	{:else}
		<ul class="list">
			{#each melee as weapon (weapon.id)}
				{@render weaponRow(weapon)}
			{/each}
		</ul>
	{/if}

	<h3 class="coc7-hud-heading">{ts('CoC7.RangeWeapons')}</h3>
	{#if ranged.length === 0}
		<p class="empty">{t('noWeapons')}</p>
	{:else}
		<ul class="list">
			{#each ranged as weapon (weapon.id)}
				{@render weaponRow(weapon)}
			{/each}
		</ul>
	{/if}
</div>

<style>
	.combat {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		/* As wide as one column of the skills drawer: (32rem - 1rem gap) / 2. */
		width: min(15.5rem, 92vw);
		/* One column: combat skills, then melee and ranged weapons; scrolls when taller than the screen. */
		max-height: calc(100vh - 16rem);
		overflow-y: auto;
	}

	.initiative {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
	}

	.list {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	/* Like a row in the skills drawer, without vertical padding. The row carries the hover highlight. */
	.row {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0 0.375rem;
		font-size: 0.8125rem;
		line-height: 1.3;
		border: 1px solid transparent;
		border-radius: 0.25rem;
	}

	.row:hover:not(.row--disabled) {
		background: var(--hud-hover);
		border-color: var(--hud-accent);
	}

	.row--disabled {
		opacity: 0.55;
	}

	/* The clickable parts of a row: plain text, the row draws the highlight. */
	.attack {
		display: flex;
		flex: 1;
		align-items: center;
		justify-content: flex-start;
		gap: 0.375rem;
		box-sizing: border-box;
		width: auto;
		min-width: 0;
		height: auto;
		min-height: 0;
		margin: 0;
		padding: 0;
		cursor: pointer;
		color: var(--hud-text);
		font: inherit;
		line-height: inherit;
		text-align: left;
		background: transparent;
		border: none;
		box-shadow: none;
	}

	.attack:disabled {
		cursor: default;
	}

	.attack--value {
		flex: none;
	}

	.img {
		flex: none;
		width: 1rem;
		height: 1rem;
		object-fit: cover;
		border: none;
		border-radius: 0.125rem;
	}

	/* The experience tick, as in the skills drawer; the slot stays empty so names line up. */
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
		text-align: left;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.value {
		margin-left: auto;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		text-align: right;
	}

	.ammo,
	.pill {
		display: inline-flex;
		flex: none;
		align-items: center;
		gap: 0.3125rem;
		width: auto;
		height: auto;
		min-height: 0;
		margin: 0;
		padding: 0 0.375rem;
		cursor: pointer;
		color: var(--hud-text);
		font: inherit;
		font-size: 0.75rem;
		line-height: 1.3;
		white-space: nowrap;
		background: var(--hud-surface);
		border: 1px solid var(--hud-border);
		border-radius: 999px;
	}


	.ammo:hover,
	.pill:hover {
		background: var(--hud-hover);
		border-color: var(--hud-accent);
	}

	.ammo--empty {
		color: var(--hud-warning);
		border-color: var(--hud-warning);
	}

	.pill--on {
		color: var(--hud-accent);
		border-color: var(--hud-accent);
	}

	.empty {
		margin: 0;
		padding: 0.125rem 0.375rem;
		color: var(--hud-muted);
		font-size: 0.75rem;
	}
</style>
