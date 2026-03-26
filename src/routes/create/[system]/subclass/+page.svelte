<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { ClassDefinition, SubclassDefinition } from '$lib/types/content-pack.js';
	import type { FeatureChoiceSelection } from '$lib/types/character.js';
	import { getSubclassFeaturesUpToLevel } from '$lib/engine/class-progression.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import DetailPanel from '$lib/components/ui/detail-panel/DetailPanel.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { rovingTabindex } from '$lib/actions/roving-tabindex.js';

	const { pack, systemId } = $derived($page.data as { pack: any; systemId: string });
	const classes: ClassDefinition[] = $derived(pack?.classes ?? []);

	const character = $derived(wizardStore.getCharacter());
	const selectedClassId = $derived(character?.classes[0]?.classId ?? '');
	const charLevel = $derived(character?.level ?? 1);

	const classDef = $derived(classes.find((c) => c.id === selectedClassId));
	const subclasses: SubclassDefinition[] = $derived(classDef?.subclasses ?? []);

	let selectedSubclassId = $state(wizardStore.getCharacter()?.classes[0]?.subclassId ?? '');

	const selectedSubclass = $derived(subclasses.find((s) => s.id === selectedSubclassId));
	const subclassFeatures = $derived(
		selectedSubclass ? getSubclassFeaturesUpToLevel(selectedSubclass, charLevel) : []
	);

	// Track feature choice selections: featureId -> choiceId -> selectedOptionIds
	let featureSelections = $state<Record<string, Record<string, string[]>>>({});

	// Populate from store on mount, reset when subclass changes
	let prevSubclassId = $state<string | null>(null);
	$effect(() => {
		if (selectedSubclassId !== prevSubclassId) {
			if (selectedSubclassId && selectedSubclassId === (wizardStore.getCharacter()?.classes[0]?.subclassId ?? '')) {
				// Re-visiting same subclass — restore saved choices
				const saved = wizardStore.getCharacter()?.classes[0]?.featureChoices ?? [];
				const restored: Record<string, Record<string, string[]>> = {};
				for (const fc of saved) {
					restored[fc.featureId] = { ...restored[fc.featureId], [fc.choiceId]: fc.selectedOptionIds };
				}
				featureSelections = restored;
			} else {
				// Different subclass selected — clear
				featureSelections = {};
			}
			prevSubclassId = selectedSubclassId;
		}
	});

	// Check all required choices are filled
	const allChoicesFilled = $derived.by(() => {
		for (const feature of subclassFeatures) {
			if (!feature.choices) continue;
			for (const choice of feature.choices) {
				const selected = featureSelections[feature.id]?.[choice.id] ?? [];
				if (selected.length < choice.count) return false;
			}
		}
		return true;
	});

	function toggleFeatureOption(featureId: string, choiceId: string, optionId: string, maxCount: number) {
		const current = featureSelections[featureId]?.[choiceId] ?? [];
		const idx = current.indexOf(optionId);
		let updated: string[];
		if (idx >= 0) {
			updated = current.filter((id) => id !== optionId);
		} else if (current.length < maxCount) {
			updated = [...current, optionId];
		} else {
			// Replace oldest selection
			updated = [...current.slice(1), optionId];
		}
		featureSelections = {
			...featureSelections,
			[featureId]: { ...featureSelections[featureId], [choiceId]: updated }
		};
	}

	function getSelectedOptions(featureId: string, choiceId: string): string[] {
		return featureSelections[featureId]?.[choiceId] ?? [];
	}

	function buildFeatureChoices(): FeatureChoiceSelection[] {
		const result: FeatureChoiceSelection[] = [];
		for (const [featureId, choices] of Object.entries(featureSelections)) {
			for (const [choiceId, selectedOptionIds] of Object.entries(choices)) {
				if (selectedOptionIds.length > 0) {
					result.push({ featureId, choiceId, selectedOptionIds });
				}
			}
		}
		return result;
	}

	function proceed() {
		if (!selectedSubclassId) return;

		// Update the class selection with the chosen subclass + any subclass feature choices
		const char = wizardStore.getCharacter();
		if (!char?.classes[0]) return;

		const existingChoices = char.classes[0].featureChoices ?? [];
		const subclassChoices = buildFeatureChoices();

		wizardStore.updateCharacter({
			classes: [{
				...char.classes[0],
				subclassId: selectedSubclassId,
				featureChoices: [...existingChoices.filter(
					(c) => !subclassChoices.some((sc) => sc.featureId === c.featureId && sc.choiceId === c.choiceId)
				), ...subclassChoices]
			}]
		});
		wizardStore.completeStep();
		goto(`/create/${systemId}/origin`);
	}
</script>

<svelte:head>
	<title>Choose Subclass - OpenPentacle</title>
</svelte:head>

<div>
	<PageHeader
		as="h1"
		title="Choose Your {classDef?.name ?? 'Class'} Subclass"
		description="Your subclass grants additional features and defines your specialization."
	/>

	<WizardNav
		backHref="/create/{systemId}/class"
		backLabel="Back"
		nextLabel="Next: Origin"
		onNext={proceed}
		nextDisabled={!selectedSubclassId || !allChoicesFilled}
		compact
	/>

	<div class="mt-4 grid gap-3 sm:gap-4 sm:grid-cols-2" role="listbox" aria-label="Subclasses" use:rovingTabindex>
		{#each subclasses as sub}
			<SelectionCard
				selected={selectedSubclassId === sub.id}
				onclick={() => (selectedSubclassId = sub.id)}
			>
				<h3 class="pr-6 font-semibold">{sub.name}</h3>
				<p class="mt-1 line-clamp-3 text-sm text-muted-foreground">{sub.description}</p>
			</SelectionCard>
		{/each}
	</div>

	<!-- Selected subclass detail panel -->
	{#if selectedSubclass}
		<div class="mt-6">
			<DetailPanel title={selectedSubclass.name}>
				<p class="text-sm text-muted-foreground">{selectedSubclass.description}</p>

				{#if subclassFeatures.length > 0}
					<h4 class="mt-4 text-sm font-medium">Features gained (up to level {charLevel})</h4>
					<div class="mt-2 space-y-3">
						{#each subclassFeatures as feature}
							<div>
								<div class="flex items-center gap-2">
									<span class="font-medium text-sm">{feature.name}</span>
									<Badge variant="outline" class="text-xs">Lv {feature.level}</Badge>
								</div>
								<p class="mt-0.5 text-xs text-muted-foreground">{feature.description}</p>

								<!-- Feature choices (e.g., Hunter's Prey options) -->
								{#if feature.choices && feature.choices.length > 0}
									{#each feature.choices as choice}
										{@const selectedIds = getSelectedOptions(feature.id, choice.id)}
										<div class="mt-2 space-y-1.5">
											<div class="flex items-center gap-2">
												<span class="text-xs text-muted-foreground">
													Choose {choice.count}: {selectedIds.length}/{choice.count} selected
												</span>
											</div>
											<div class="flex flex-wrap gap-1.5">
												{#each choice.options as option}
													{@const isSelected = selectedIds.includes(option.id)}
													<button
														type="button"
														class="rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors
															{isSelected ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-muted-foreground/50'}"
														onclick={() => toggleFeatureOption(feature.id, choice.id, option.id, choice.count)}
													>
														<span class="font-medium">{option.name}</span>
														{#if isSelected && option.description}
															<p class="mt-0.5 text-muted-foreground leading-relaxed">{option.description}</p>
														{/if}
													</button>
												{/each}
											</div>
										</div>
									{/each}
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</DetailPanel>
		</div>
	{/if}

	<WizardNav
		backHref="/create/{systemId}/class"
		backLabel="Back"
		nextLabel="Next: Origin"
		onNext={proceed}
		nextDisabled={!selectedSubclassId || !allChoicesFilled}
	/>
</div>
