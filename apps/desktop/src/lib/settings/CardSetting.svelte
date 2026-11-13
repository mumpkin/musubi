<!-- SPDX-License-Identifier: GPL-3.0-or-later -->
<!-- The flashcard section of the settings: how many new cards a review
     brings each day, on this device. -->
<script lang="ts">
	import type { DeviceSettings } from '../bindings/DeviceSettings.ts';
	import {
		boundedNumber,
		NEW_CARDS_PER_DAY,
		setNewCardsPerDay,
	} from './commands.ts';

	interface Props {
		settings: DeviceSettings;
		onSettings: (settings: DeviceSettings) => void;
		onError: (message: string) => void;
	}

	const { settings, onSettings, onError }: Props = $props();

	function change(input: HTMLInputElement): void {
		const count = boundedNumber(input.value, NEW_CARDS_PER_DAY);
		if (count === undefined) {
			input.value = String(settings.newCardsPerDay);
			return;
		}
		setNewCardsPerDay(count).then(onSettings).catch((error: unknown) => {
			onError(String(error));
		});
	}
</script>

<section aria-labelledby="cards-heading">
	<h3 id="cards-heading">Flashcards</h3>
	<label class="line">
		At most
		<input
			type="number"
			min={NEW_CARDS_PER_DAY.min}
			max={NEW_CARDS_PER_DAY.max}
			value={settings.newCardsPerDay}
			onchange={(event) => {
				change(event.currentTarget);
			}}
		/>
		new cards a day
	</label>
</section>

<style>
	.line {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		padding: 0.25rem 0;
	}

	input {
		width: 4.5rem;
		padding: 0.2rem 0.4rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--background);
		color: inherit;
		font: inherit;
	}
</style>
