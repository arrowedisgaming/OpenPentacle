<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { OriginLayer, OriginOption } from '$lib/types/content-pack.js';
	import type { OriginSelection } from '$lib/types/character.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import DetailPanel from '$lib/components/ui/detail-panel/DetailPanel.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Eye } from 'lucide-svelte';
	import { rovingTabindex } from '$lib/actions/roving-tabindex.js';

	const { pack, systemId } = $derived($page.data as { pack: any; systemId: string });
	const originLayers: OriginLayer[] = $derived(
		(pack?.origins ?? []).sort((a: OriginLayer, b: OriginLayer) => a.order - b.order)
	);

	// Track selections per layer
	let selections = $state<Record<string, { optionId: string; subOptionId?: string }>>(
		Object.fromEntries(
			(wizardStore.getCharacter()?.origins ?? []).map((o) => [
				o.layerId,
				{ optionId: o.optionId, subOptionId: o.subOptionId }
			])
		)
	);

	function selectOption(layerId: string, optionId: string) {
		selections[layerId] = { optionId, subOptionId: undefined };
	}

	function selectSubOption(layerId: string, subOptionId: string) {
		if (selections[layerId]) {
			selections[layerId] = { ...selections[layerId], subOptionId };
		}
	}

	const allLayersSelected = $derived(
		originLayers.every((layer) => selections[layer.id]?.optionId)
	);

	function getSelectedOption(layer: OriginLayer): OriginOption | undefined {
		const sel = selections[layer.id];
		if (!sel) return undefined;
		return layer.options.find((o) => o.id === sel.optionId);
	}

	function proceed() {
		if (!allLayersSelected) return;

		const origins: OriginSelection[] = originLayers.map((layer) => ({
			layerId: layer.id,
			optionId: selections[layer.id].optionId,
			subOptionId: selections[layer.id].subOptionId,
			choices: []
		}));

		wizardStore.updateCharacter({ origins });
		wizardStore.completeStep();
		goto(`/create/${systemId}/abilities`);
	}
</script>

<svelte:head>
	<title>Choose Origin - OpenPentacle</title>
</svelte:head>

<div>
	<WizardNav
		backHref="/create/{systemId}/class"
		backLabel="Back"
		nextLabel="Next: Abilities"
		onNext={proceed}
		nextDisabled={!allLayersSelected}
		compact
	/>

	{#each originLayers as layer}
		<div class="mb-8">
			<PageHeader title={layer.name} description={layer.description} />

			<div class="mt-4 grid gap-3 sm:grid-cols-2" role="listbox" aria-label={layer.name} use:rovingTabindex>
				{#each layer.options as option}
					<SelectionCard
						selected={selections[layer.id]?.optionId === option.id}
						onclick={() => selectOption(layer.id, option.id)}
					>
						<div class="flex items-start justify-between pr-6">
							<h3 class="font-semibold">{option.name}</h3>
							<span class="text-xs text-muted-foreground">{option.size} &middot; {option.speed} ft</span>
						</div>
						<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{option.description}</p>
						{#if option.darkvision}
							<Badge variant="secondary" class="mt-2 gap-1 text-xs">
								<Eye class="size-3" />
								Darkvision {option.darkvision} ft
							</Badge>
						{/if}
					</SelectionCard>
				{/each}
			</div>

			<!-- Sub-options (e.g., elf subraces) -->
			{#if getSelectedOption(layer)?.subOptions && getSelectedOption(layer)!.subOptions!.length > 0}
				<div class="mt-4">
					<h3 class="text-lg font-medium">Choose a {getSelectedOption(layer)!.name} subtype</h3>
					<div class="mt-3 grid gap-3 sm:grid-cols-2" role="listbox" aria-label="Sub-options" use:rovingTabindex>
						{#each getSelectedOption(layer)!.subOptions! as sub}
							<SelectionCard
								selected={selections[layer.id]?.subOptionId === sub.id}
								onclick={() => selectSubOption(layer.id, sub.id)}
							>
								<h4 class="font-semibold">{sub.name}</h4>
								<p class="mt-1 text-sm text-muted-foreground">{sub.description}</p>
							</SelectionCard>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Selected option details -->
			{#if getSelectedOption(layer)}
				{@const opt = getSelectedOption(layer)!}
				<div class="mt-4">
					<DetailPanel title="{opt.name} Traits">
						<ul class="space-y-1 text-sm">
							{#each opt.traits as trait}
								<li>
									<span class="font-medium">{trait.name}:</span>
									<span class="text-muted-foreground"> {trait.description}</span>
								</li>
							{/each}
						</ul>
						{#if opt.languages.length > 0}
							<p class="mt-2 text-sm">
								<span class="font-medium">Languages:</span>
								<span class="text-muted-foreground"> {opt.languages.join(', ')}</span>
							</p>
						{/if}
					</DetailPanel>
				</div>
			{/if}
		</div>
	{/each}

	<WizardNav
		backHref="/create/{systemId}/class"
		backLabel="Back"
		nextLabel="Next: Abilities"
		onNext={proceed}
		nextDisabled={!allLayersSelected}
	/>
</div>
