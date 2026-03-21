<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { ClassDefinition, SubclassDefinition } from '$lib/types/content-pack.js';
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

	function proceed() {
		if (!selectedSubclassId) return;

		// Update the class selection with the chosen subclass
		const char = wizardStore.getCharacter();
		if (!char?.classes[0]) return;

		wizardStore.updateCharacter({
			classes: [{
				...char.classes[0],
				subclassId: selectedSubclassId
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
		nextDisabled={!selectedSubclassId}
		compact
	/>

	<div class="mt-4 grid gap-3 sm:grid-cols-2" role="listbox" aria-label="Subclasses" use:rovingTabindex>
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
								<p class="mt-0.5 text-xs text-muted-foreground line-clamp-3">{feature.description}</p>
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
		nextDisabled={!selectedSubclassId}
	/>
</div>
