<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { BackgroundDefinition } from '$lib/types/content-pack.js';
	import type { AbilityBonus } from '$lib/types/character.js';
	import type { AbilityId } from '$lib/types/common.js';
	import { ABILITY_NAMES } from '$lib/types/common.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import DetailPanel from '$lib/components/ui/detail-panel/DetailPanel.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { rovingTabindex } from '$lib/actions/roving-tabindex.js';

	const { pack, systemId } = $derived($page.data as { pack: any; systemId: string });
	const backgrounds: BackgroundDefinition[] = $derived(pack?.backgrounds ?? []);

	let selectedId = $state(wizardStore.getCharacter()?.background?.backgroundId ?? '');

	// The selected background definition
	const selectedBg = $derived(backgrounds.find((b) => b.id === selectedId) ?? null);

	// Extract the three eligible abilities from the background
	const eligibleAbilities = $derived(
		(selectedBg?.abilityScoreChanges ?? [])
			.map((c) => c.ability)
			.filter((a): a is AbilityId => a !== 'choice')
	);
	const hasAbilityChoice = $derived(eligibleAbilities.length === 3);

	// --- Ability score increase state ---
	// Restore from existing character data if navigating back
	function initFromExisting(): { mode: '+2+1' | '+1+1+1'; plus2: AbilityId | ''; plus1: AbilityId | '' } {
		const existing = wizardStore.getCharacter()?.abilityScores?.originBonuses?.filter(
			(b) => b.sourceType === 'background'
		) ?? [];
		if (existing.length === 3 && existing.every((b) => b.value === 1)) {
			return { mode: '+1+1+1', plus2: '', plus1: '' };
		}
		const two = existing.find((b) => b.value === 2);
		const one = existing.find((b) => b.value === 1);
		if (two && one) {
			return { mode: '+2+1', plus2: two.ability, plus1: one.ability };
		}
		return { mode: '+2+1', plus2: '', plus1: '' };
	}

	const init = initFromExisting();
	let asiMode = $state<'+2+1' | '+1+1+1'>(init.mode);
	let plus2Ability = $state<AbilityId | ''>(init.plus2);
	let plus1Ability = $state<AbilityId | ''>(init.plus1);

	// Reset ASI choices when background changes
	$effect(() => {
		// Track selectedId to reset when it changes
		if (selectedId) {
			// Only reset if the eligible abilities changed (different background)
			const existingBgId = wizardStore.getCharacter()?.background?.backgroundId;
			if (existingBgId !== selectedId) {
				plus2Ability = '';
				plus1Ability = '';
			}
		}
	});

	const asiComplete = $derived(() => {
		if (!hasAbilityChoice) return true;
		if (asiMode === '+1+1+1') return true;
		return plus2Ability !== '' && plus1Ability !== '' && plus2Ability !== plus1Ability;
	});

	function buildBackgroundBonuses(): AbilityBonus[] {
		if (!hasAbilityChoice) return [];
		const source = `background:${selectedId}`;
		if (asiMode === '+1+1+1') {
			return eligibleAbilities.map((ab) => ({
				ability: ab,
				value: 1,
				source,
				sourceType: 'background' as const
			}));
		}
		const bonuses: AbilityBonus[] = [];
		if (plus2Ability) {
			bonuses.push({ ability: plus2Ability, value: 2, source, sourceType: 'background' });
		}
		if (plus1Ability) {
			bonuses.push({ ability: plus1Ability, value: 1, source, sourceType: 'background' });
		}
		return bonuses;
	}

	function proceed() {
		if (!selectedId || !asiComplete()) return;

		// Store background bonuses in originBonuses (filter out old background bonuses first)
		const existingOriginBonuses = (wizardStore.getCharacter()?.abilityScores?.originBonuses ?? [])
			.filter((b) => b.sourceType !== 'background');
		const bgBonuses = buildBackgroundBonuses();

		wizardStore.updateCharacter({
			background: {
				backgroundId: selectedId,
				choices: []
			},
			abilityScores: {
				...wizardStore.getCharacter()!.abilityScores,
				originBonuses: [...existingOriginBonuses, ...bgBonuses]
			}
		});
		wizardStore.completeStep();
		goto(`/create/${systemId}/skills`);
	}
</script>

<svelte:head>
	<title>Background - OpenPentacle</title>
</svelte:head>

<div>
	<PageHeader
		as="h1"
		title="Choose Your Background"
		description="Your background describes what your character did before becoming an adventurer."
	/>

	<WizardNav
		backHref="/create/{systemId}/abilities"
		backLabel="Back"
		nextLabel="Next: Skills"
		onNext={proceed}
		nextDisabled={!selectedId || !asiComplete()}
		compact
	/>

	<div class="mt-6 grid gap-3 sm:grid-cols-2" role="listbox" aria-label="Backgrounds" use:rovingTabindex>
		{#each backgrounds as bg}
			<SelectionCard
				selected={selectedId === bg.id}
				onclick={() => (selectedId = bg.id)}
			>
				<h3 class="font-semibold">{bg.name}</h3>
				<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{bg.description}</p>
				<div class="mt-2 flex flex-wrap gap-1">
					{#each bg.skillProficiencies as prof}
						<Badge variant="secondary" class="text-xs">{prof.value}</Badge>
					{/each}
					{#if bg.abilityScoreChanges}
						{#each bg.abilityScoreChanges as asc}
							{#if asc.ability !== 'choice'}
								<Badge variant="outline" class="text-xs">{asc.ability.toUpperCase()}</Badge>
							{/if}
						{/each}
					{/if}
				</div>
			</SelectionCard>
		{/each}
	</div>

	{#if selectedBg}
		<div class="mt-6">
			<DetailPanel title={selectedBg.name}>
				<p class="text-sm text-muted-foreground">{selectedBg.description}</p>
				<div class="mt-4 space-y-2 text-sm">
					<p><span class="font-medium">Skills:</span> {selectedBg.skillProficiencies.map(p => p.value).join(', ')}</p>
					{#if selectedBg.toolProficiencies.length > 0}
						<p><span class="font-medium">Tools:</span> {selectedBg.toolProficiencies.map(p => p.value).join(', ')}</p>
					{/if}
					{#if selectedBg.languages.length > 0}
						<p><span class="font-medium">Languages:</span> {selectedBg.languages.map(l => l.value).join(', ')}</p>
					{/if}
					{#if selectedBg.feature}
						<p><span class="font-medium">Feature:</span> {selectedBg.feature.name} - {selectedBg.feature.description}</p>
					{/if}
					{#if selectedBg.feat}
						<p><span class="font-medium">Origin Feat:</span> {selectedBg.feat}</p>
					{/if}
				</div>
			</DetailPanel>
		</div>

		<!-- Ability Score Increases -->
		{#if hasAbilityChoice}
			<Card.Root class="mt-6">
				<Card.Header>
					<Card.Title class="text-base">Ability Score Increases</Card.Title>
					<p class="text-sm text-muted-foreground">
						Increase one of {eligibleAbilities.map(a => ABILITY_NAMES[a]).join(', ')} by 2 and another by 1,
						or increase all three by 1. No score can exceed 20.
					</p>
				</Card.Header>
				<Card.Content>
					<!-- Mode selector -->
					<div class="flex flex-wrap gap-2">
						<button
							type="button"
							class="rounded-md border px-3 py-1.5 text-sm transition-colors {asiMode === '+2+1' ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}"
							onclick={() => { asiMode = '+2+1'; }}
						>
							+2 to one, +1 to another
						</button>
						<button
							type="button"
							class="rounded-md border px-3 py-1.5 text-sm transition-colors {asiMode === '+1+1+1' ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}"
							onclick={() => { asiMode = '+1+1+1'; plus2Ability = ''; plus1Ability = ''; }}
						>
							+1 to all three
						</button>
					</div>

					{#if asiMode === '+2+1'}
						<Separator class="my-3" />
						<div class="space-y-3">
							<div>
								<span class="mr-2 text-sm text-muted-foreground">+2 to:</span>
								<div class="mt-1 inline-flex flex-wrap gap-2">
									{#each eligibleAbilities as ab}
										{@const isOther = plus1Ability === ab}
										<button
											type="button"
											disabled={isOther}
											class="rounded-md border px-3 py-1.5 text-sm transition-colors
												{plus2Ability === ab ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}
												{isOther ? 'opacity-40 cursor-not-allowed' : ''}"
											onclick={() => { plus2Ability = ab; }}
										>
											{ABILITY_NAMES[ab]}
										</button>
									{/each}
								</div>
							</div>
							<div>
								<span class="mr-2 text-sm text-muted-foreground">+1 to:</span>
								<div class="mt-1 inline-flex flex-wrap gap-2">
									{#each eligibleAbilities as ab}
										{@const isOther = plus2Ability === ab}
										<button
											type="button"
											disabled={isOther}
											class="rounded-md border px-3 py-1.5 text-sm transition-colors
												{plus1Ability === ab ? 'border-primary bg-accent font-medium' : 'border-border hover:bg-accent/50'}
												{isOther ? 'opacity-40 cursor-not-allowed' : ''}"
											onclick={() => { plus1Ability = ab; }}
										>
											{ABILITY_NAMES[ab]}
										</button>
									{/each}
								</div>
							</div>
						</div>
					{:else}
						<div class="mt-3 flex flex-wrap gap-2">
							{#each eligibleAbilities as ab}
								<Badge variant="secondary" class="text-sm">
									{ABILITY_NAMES[ab]} +1
								</Badge>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}
	{/if}

	<WizardNav
		backHref="/create/{systemId}/abilities"
		backLabel="Back"
		nextLabel="Next: Skills"
		onNext={proceed}
		nextDisabled={!selectedId || !asiComplete()}
	/>
</div>
