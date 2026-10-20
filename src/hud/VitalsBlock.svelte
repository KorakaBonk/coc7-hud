<script lang="ts">
	import type { Snippet } from 'svelte';
	import type {
		ConditionView,
		MeterKey,
		MeterView,
		RollableAttribute,
		VitalsView,
	} from '../adapter/types.ts';
	import { t, tf, ts } from '../localize.ts';
	import ConditionStrip from './ConditionStrip.svelte';

	interface Props {
		vitals: VitalsView;
		conditions: ConditionView[];
		onOpenSheet: () => void;
		onSetMeter: (key: MeterKey, value: number) => void;
		/** +1 / -1 on a bar. */
		onChangeMeter: (key: MeterKey, delta: number) => void;
		/** Sanity or Luck check, from the icon on its bar. */
		onRoll: (key: RollableAttribute, event: MouseEvent) => void;
		onResetDailySanity: () => void;
		/** NPCs: the sheet's Sanity check for the targeted tokens. */
		onRollSanityLoss: (event: MouseEvent) => void;
		/** Rendered between the portrait and the details column (the drawer buttons). */
		children?: Snippet;
	}

	let {
		vitals,
		conditions,
		onOpenSheet,
		onSetMeter,
		onChangeMeter,
		onRoll,
		onResetDailySanity,
		onRollSanityLoss,
		children,
	}: Props = $props();

	let portraitWidth = $state(0);
	let portraitHeight = $state(0);

	/** The portrait border, which sits outside the image on every side. */
	const PORTRAIT_BORDER_PX = 1;
	/** Width over height of the loaded image; very tall or wide art is letterboxed beyond this range. */
	const MIN_RATIO = 0.4;
	const MAX_RATIO = 2;
	let imageRatio = $state(1);

	let image = $state<HTMLImageElement | null>(null);

	function measureImage(): void {
		if (!image?.complete || image.naturalHeight === 0) return;
		imageRatio = Math.min(MAX_RATIO, Math.max(MIN_RATIO, image.naturalWidth / image.naturalHeight));
	}

	// A cached image can finish loading before the load listener is attached; measure it anyway.
	$effect(() => {
		void vitals.img;
		measureImage();
	});

	// The portrait is as tall as the details column and as wide as the image's aspect ratio
	// needs, so the whole picture shows uncropped.
	const portraitColumnWidth = $derived(
		portraitHeight > 0
			? `${Math.round((portraitHeight - 2 * PORTRAIT_BORDER_PX) * imageRatio + 2 * PORTRAIT_BORDER_PX)}px`
			: undefined,
	);

	interface MeterBar {
		key: MeterKey;
		icon: string;
		/** Short label for the step buttons, e.g. "HP". */
		short: string;
		/** Full name, e.g. "Hit Points". */
		label: string;
		meter: MeterView;
		low?: boolean;
		roll?: RollableAttribute;
	}

	// Up to two bar rows: HP and MP, then Sanity and Luck. NPCs skip the attributes they lack,
	// and the remaining bars close up in pairs.
	const rows = $derived.by<MeterBar[][]>(() => {
		const { hp, mp, san, luck } = vitals;
		const bars: MeterBar[] = [];
		if (hp) {
			bars.push({
				key: 'hp',
				icon: 'fa-solid fa-heart',
				short: ts('CoC7.HP'),
				label: ts('CoC7.HitPoints'),
				meter: hp,
				low: hp.percent <= 50,
			});
		}
		if (mp) {
			bars.push({ key: 'mp', icon: 'fa-solid fa-sparkles', short: ts('CoC7.MP'), label: ts('CoC7.MagicPoints'), meter: mp });
		}
		if (san) {
			bars.push({ key: 'san', icon: 'fa-solid fa-brain', short: ts('CoC7.SAN'), label: ts('CoC7.Sanity'), meter: san, roll: 'san' });
		}
		if (luck) {
			bars.push({ key: 'lck', icon: 'fa-solid fa-clover', short: ts('CoC7.Luck'), label: ts('CoC7.Luck'), meter: luck, roll: 'lck' });
		}
		const result: MeterBar[][] = [];
		for (let index = 0; index < bars.length; index += 2) result.push(bars.slice(index, index + 2));
		return result;
	});

	// Daily sanity loss is an investigator rule; NPCs never show the chip.
	const daily = $derived(vitals.kind === 'investigator' ? vitals.san : null);
	// The daily sanity limit is only meaningful once it has been set (it is 0 until then).
	const dailyOver = $derived(!!daily && daily.dailyLimit > 0 && daily.dailyLoss >= daily.dailyLimit);
</script>

{#snippet meterBar(bar: MeterBar)}
	<div
		class="bar bar--{bar.key}"
		class:bar--low={bar.low}
		style:--fill="{bar.meter.percent}%"
		role="meter"
		aria-label={bar.label}
		aria-valuenow={bar.meter.value}
		aria-valuemin={0}
		aria-valuemax={bar.meter.max}
	>
		<span class="bar-label">
			<button
				type="button"
				class="step"
				aria-label={tf('remove', { label: bar.short })}
				data-hud-tooltip={tf('remove', { label: bar.short })}
				onclick={() => onChangeMeter(bar.key, -1)}
			>
				<i class="fa-solid fa-minus"></i>
			</button>

			<span class="value">
				{#if bar.roll}
					{@const roll = bar.roll}
					<button
						type="button"
						class="roll"
						aria-label={tf('rollCheck', { label: bar.label })}
						data-hud-tooltip={tf('rollCheck', { label: bar.label })}
						onclick={(event) => onRoll(roll, event)}
					>
						<i class={bar.icon}></i>
					</button>
				{:else}
					<i class={bar.icon} data-hud-tooltip={bar.label}></i>
				{/if}
				<input
					class="value-input"
					type="number"
					min="0"
					max={bar.meter.max}
					aria-label={bar.label}
					value={bar.meter.value}
					onfocus={(event) => event.currentTarget.select()}
					onchange={(event) => {
						const input = event.currentTarget;
						if (input.value === '') input.value = String(bar.meter.value);
						else onSetMeter(bar.key, Number(input.value));
					}}
				/>
				<span class="max">/ {bar.meter.max}</span>
			</span>

			<button
				type="button"
				class="step"
				aria-label={tf('add', { label: bar.short })}
				data-hud-tooltip={tf('add', { label: bar.short })}
				onclick={() => onChangeMeter(bar.key, 1)}
			>
				<i class="fa-solid fa-plus"></i>
			</button>
		</span>
	</div>
{/snippet}

<div class="vitals">
	<div
		class="portrait-column"
		style:width={portraitColumnWidth}
		bind:clientWidth={portraitWidth}
		bind:clientHeight={portraitHeight}
	>
		<button
			type="button"
			class="portrait"
			data-hud-tooltip={t('openSheet')}
			aria-label={t('openSheet')}
			onclick={onOpenSheet}
		>
			<img bind:this={image} src={vitals.img} alt={vitals.name} draggable="false" onload={measureImage} />
		</button>
		<ConditionStrip {conditions} width={portraitWidth} height={portraitHeight} />
	</div>

	{@render children?.()}

	<div class="details">
		<div class="title">
			<div class="title-text">
				<span class="name">{vitals.name}</span>
				{#if vitals.summary}
					<span class="summary" data-hud-tooltip={vitals.summary}>{vitals.summary}</span>
				{/if}
			</div>
			<!-- NPCs: the Sanity loss for seeing them; rolls the sheet's Sanity check for the targets. -->
			{#if vitals.sanLoss !== null}
				<button
					type="button"
					class="san-loss"
					aria-label={t('sanLoss')}
					data-hud-tooltip={t('sanLoss')}
					onclick={onRollSanityLoss}
				>
					<i class="fa-solid fa-brain"></i>
					{vitals.sanLoss}
				</button>
			{/if}
		</div>

		{#each rows as row, index (index)}
			<div class="bars">
				{#each row as bar (bar.key)}
					{@render meterBar(bar)}
				{/each}
			</div>
		{/each}

		<div class="chips">
			{#if vitals.mov !== null}
				<span class="chip" data-hud-tooltip={ts('CoC7.Movement')}>
					<i class="fa-solid fa-person-walking"></i>
					{vitals.mov}
				</span>
			{/if}
			{#if vitals.build !== null}
				<span class="chip" data-hud-tooltip={ts('CoC7.Build')}>
					<i class="fa-solid fa-weight-hanging"></i>
					{vitals.build}
				</span>
			{/if}
			{#if vitals.db !== null}
				<span class="chip" data-hud-tooltip={ts('CoC7.BonusDamage')}>
					<i class="fa-solid fa-hand-fist"></i>
					{vitals.db}
				</span>
			{/if}
			<span class="chip" data-hud-tooltip={ts('CoC7.Armor')}>
				<i class="fa-solid fa-shield"></i>
				{vitals.armor}
			</span>
			{#if vitals.attacksPerRound !== null}
				<span class="chip" data-hud-tooltip={t('attacksPerRound')}>
					<i class="fa-solid fa-swords"></i>
					{vitals.attacksPerRound}
				</span>
			{/if}
			{#if daily}
				{@const dailyLabel = tf('dailySanity', { loss: daily.dailyLoss, limit: daily.dailyLimit })}
				<button
					type="button"
					class="chip chip--button chip--end"
					class:chip--warning={dailyOver}
					aria-label={dailyLabel}
					data-hud-tooltip={dailyLabel}
					onclick={onResetDailySanity}
				>
					<i class="fa-solid fa-calendar-day"></i>
					{daily.dailyLoss}/{daily.dailyLimit}
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.vitals {
		display: flex;
		align-items: stretch;
		gap: 0.75rem;
	}

	/* Above the tentacles the light theme draws behind the portrait (see .hud-bar in Hud.svelte). */
	.portrait-column {
		position: relative;
		z-index: 1;
		display: flex;
		flex: none;
		flex-direction: column;
		/* Until the height is measured; afterwards the width follows the image's aspect ratio. */
		width: 6.25rem;
	}

	.portrait {
		pointer-events: auto;
		width: 100%;
		flex: 1;
		min-height: 0;
		/* The image must not drive the HUD height; the portrait fills whatever the details column needs. */
		contain: size;
		padding: 0;
		overflow: hidden;
		cursor: pointer;
		background: var(--hud-portrait-bg);
		/* The buttons' and chips' border. */
		border: 1px solid var(--hud-border);
		border-radius: 0.375rem;
	}

	/* The whole picture, never cropped; art outside the supported ratio range is letterboxed. */
	.portrait img {
		display: block;
		width: 100%;
		height: 100%;
		object-fit: contain;
		object-position: center;
		border: 0;
	}

	/*
	 * Four rows (title, two bar rows, chips) in the height of three full-size rows:
	 * 2.25 (title) + 1.25 + 1.25 (bars) + 1.625 (chips) + 3 row gaps of 0.28 stays within 7.5rem.
	 */
	.details {
		--hud-row-gap: 0.28rem;

		display: flex;
		flex-direction: column;
		gap: var(--hud-row-gap);
		min-width: 19rem;
	}

	/* The title never widens the HUD: the bars and chips set the width, long text is cut off. */
	.title {
		contain: inline-size;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		min-height: var(--hud-row-height);
		line-height: 1.15;
	}

	.title-text {
		display: flex;
		flex: 1;
		flex-direction: column;
		justify-content: center;
		min-width: 0;
	}

	/* Styled like the drawer buttons, at the right end of the name row. */
	.san-loss {
		display: inline-flex;
		flex: none;
		align-items: center;
		justify-content: center;
		gap: 0.3125rem;
		box-sizing: border-box;
		width: auto;
		height: var(--hud-row-height);
		min-height: 0;
		margin: 0;
		padding: 0 0.625rem;
		cursor: pointer;
		color: var(--hud-text);
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 700;
		line-height: 1;
		white-space: nowrap;
		background: var(--hud-surface);
		border: 1px solid var(--hud-border);
		border-radius: 0.375rem;
	}

	.san-loss:hover {
		background: var(--hud-hover);
		border-color: var(--hud-accent);
	}

	.san-loss i {
		margin: 0;
	}

	.name {
		min-width: 0;
		overflow: hidden;
		font-size: 1.125rem;
		font-weight: 700;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	/* One line that never widens the HUD; a long archetype and occupation is cut off. */
	.summary {
		overflow: hidden;
		color: var(--hud-muted);
		font-size: 0.75rem;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.bars {
		display: flex;
		gap: 0.25rem;
	}

	.bar {
		position: relative;
		flex: 1 1 0;
		min-width: 0;
		height: 1.25rem;
		overflow: hidden;
		background: var(--hud-bar-track);
		border: 1px solid var(--hud-border);
		border-radius: 0.25rem;
	}

	.bar::before {
		content: '';
		position: absolute;
		inset: 0 auto 0 0;
		width: var(--fill, 0%);
		background: var(--bar-color);
		transition: width 0.25s ease;
	}

	.bar--hp {
		--bar-color: var(--hud-bar-hp);
	}

	.bar--hp.bar--low {
		--bar-color: var(--hud-bar-hp-low);
	}

	.bar--mp {
		--bar-color: var(--hud-bar-mp);
	}

	.bar--san {
		--bar-color: var(--hud-bar-san);
	}

	.bar--lck {
		--bar-color: var(--hud-bar-luck);
	}

	.bar-label {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 100%;
		color: var(--hud-bar-text);
		font-size: 0.75rem;
		font-weight: 600;
		text-shadow: var(--hud-bar-text-shadow);
	}

	.value {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
	}

	.max {
		white-space: nowrap;
	}

	.value-input {
		width: 2.25rem;
		height: 1.0625rem;
		padding: 0;
		color: inherit;
		font: inherit;
		text-align: center;
		text-shadow: inherit;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 0.25rem;
		appearance: textfield;
	}

	.value-input::-webkit-inner-spin-button,
	.value-input::-webkit-outer-spin-button {
		appearance: none;
		margin: 0;
	}

	.value-input:hover,
	.value-input:focus {
		background: var(--hud-input-focus);
		border-color: var(--hud-border);
		outline: none;
	}

	/* The - and + buttons sit at the two ends of the bar. */
	.step,
	.roll {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		min-height: 0;
		margin: 0;
		padding: 0;
		cursor: pointer;
		color: inherit;
		font: inherit;
		line-height: 1;
		background: transparent;
		border: none;
	}

	.step {
		width: 1.5rem;
	}

	.step:hover {
		background: var(--hud-hover);
	}

	/* The Sanity and Luck icons roll a check. */
	.roll {
		width: auto;
		padding: 0 0.125rem;
		border-radius: 0.25rem;
	}

	.roll:hover {
		color: var(--hud-accent);
	}

	.roll i {
		margin: 0;
	}

	.chips {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.375rem;
		min-height: 1.625rem;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3125rem;
		padding: 0.0625rem 0.5rem;
		font-size: 0.75rem;
		background: var(--hud-surface);
		border: 1px solid var(--hud-border);
		border-radius: 999px;
	}

	/* The daily sanity button must match the other chips exactly, so undo button defaults. */
	.chip--button {
		box-sizing: border-box;
		width: auto;
		height: auto;
		min-height: 0;
		margin: 0;
		cursor: pointer;
		color: inherit;
		font: inherit;
		font-size: 0.75rem;
		line-height: inherit;
	}

	.chip--button:hover {
		background: var(--hud-hover);
		border-color: var(--hud-accent);
	}

	.chip--end {
		margin-left: auto;
	}

	.chip--warning {
		color: var(--hud-warning);
		border-color: var(--hud-warning);
	}
</style>
