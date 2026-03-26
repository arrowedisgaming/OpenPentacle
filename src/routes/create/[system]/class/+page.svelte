<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { ClassDefinition, ClassFeature, SystemId } from '$lib/types/content-pack.js';
	import type { FeatureChoiceSelection } from '$lib/types/character.js';
	import { getSubclassLevel, getClassFeaturesUpToLevel, getASILevels, resolveFeatureChoiceProficiencies } from '$lib/engine/class-progression.js';
	import { buildClassSelection } from '$lib/wizard/class-step.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import DetailPanel from '$lib/components/ui/detail-panel/DetailPanel.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Sword, Wand2, Shield, Heart, Cross, Flame, Music, Leaf, Skull, BookOpen, Zap, Target, Star, Sparkles, ChevronDown, ChevronUp, Search } from 'lucide-svelte';
	import { rovingTabindex } from '$lib/actions/roving-tabindex.js';

	const { pack, systemId } = $derived($page.data as { pack: any; systemId: string });
	const classes: ClassDefinition[] = $derived(pack?.classes ?? []);

	let selectedClassId = $state(wizardStore.getCharacter()?.classes[0]?.classId ?? '');
	let selectedLevel = $state(wizardStore.getCharacter()?.classes[0]?.level ?? 1);

	// Map class IDs to icons
	const classIcons: Record<string, typeof Sword> = {
		fighter: Sword, wizard: Wand2, paladin: Shield, cleric: Cross,
		rogue: Target, ranger: Leaf, barbarian: Flame, bard: Music,
		warlock: Skull, sorcerer: Zap, druid: Leaf, monk: Heart,
	};

	const selectedClass = $derived(classes.find((c) => c.id === selectedClassId));
	const subclassTrigger = $derived(selectedClass ? getSubclassLevel(selectedClass) : null);
	const asiLevels = $derived(selectedClass ? getASILevels(selectedClass) : []);
	const needsSubclass = $derived(subclassTrigger !== null && selectedLevel >= subclassTrigger);

	// Build level-by-level feature preview for selected class (includes descriptions)
	const featurePreview = $derived(() => {
		if (!selectedClass) return [];
		const rows: { level: number; features: { name: string; description: string }[]; isSubclass: boolean; isASI: boolean; active: boolean }[] = [];
		for (const prog of selectedClass.progression) {
			if (prog.features.length === 0) continue;
			rows.push({
				level: prog.level,
				features: prog.features.map((f) => ({ name: f.name, description: f.description })),
				isSubclass: prog.level === subclassTrigger,
				isASI: asiLevels.includes(prog.level),
				active: prog.level <= selectedLevel
			});
		}
		return rows;
	});

	// Features with choices for current class + level
	const featuresWithChoices = $derived.by(() => {
		if (!selectedClass) return [];
		const features = getClassFeaturesUpToLevel(selectedClass, selectedLevel);
		return features.filter((f) => f.choices && f.choices.length > 0);
	});

	// Track feature choice selections: featureId -> choiceId -> selectedOptionIds
	let featureSelections = $state<Record<string, Record<string, string[]>>>({});

	// Search filters for feature choices with many options: "featureId:choiceId" -> search text
	let featureSearchFilters = $state<Record<string, string>>({});

	const SEARCH_THRESHOLD = 10; // Show search box when 10+ options

	// Reset selections when class changes
	$effect(() => {
		if (selectedClassId) {
			featureSelections = {};
			featureSearchFilters = {};
		}
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

	// Build FeatureChoiceSelection[] for storage
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

	let expandedFeature = $state<string | null>(null);

	function toggleFeature(key: string) {
		expandedFeature = expandedFeature === key ? null : key;
	}

	function selectClass(classId: string) {
		selectedClassId = classId;
	}

	function handleLevelInput(e: Event) {
		const val = parseInt((e.target as HTMLInputElement).value, 10);
		if (!isNaN(val)) selectedLevel = Math.max(1, Math.min(20, val));
	}

	function proceed() {
		if (!selectedClassId || !selectedClass) return;

		// Initialize wizard if not started
		const char = wizardStore.getCharacter();
		if (!char) {
			wizardStore.start(systemId as SystemId);
		}

		const latestChar = wizardStore.getCharacter();
		const existingClass = latestChar?.classes[0];
		const selectedClassFeatureChoices = buildFeatureChoices();
		const nextClassSelection = buildClassSelection({
			existingClass,
			selectedClassId,
			selectedLevel,
			hitDie: selectedClass.hitDie,
			selectedClassFeatureChoices
		});
		const featureChoiceProficiencies = resolveFeatureChoiceProficiencies(
			selectedClass,
			selectedClassFeatureChoices
		);

		wizardStore.updateCharacter({
			level: selectedLevel,
			classes: [nextClassSelection],
			proficiencies: [
				...selectedClass.savingThrows.map((st) => ({
					type: 'saving-throw' as const,
					value: st,
					source: `class:${selectedClassId}`
				})),
				...selectedClass.armorProficiencies.map((a) => ({
					type: 'armor' as const,
					value: a,
					source: `class:${selectedClassId}`
				})),
				...selectedClass.weaponProficiencies.map((w) => ({
					type: 'weapon' as const,
					value: w,
					source: `class:${selectedClassId}`
				})),
				...featureChoiceProficiencies
			]
		});
		wizardStore.completeStep();

		// If subclass is needed, go to subclass step; otherwise skip to origin
		if (needsSubclass) {
			goto(`/create/${systemId}/subclass`);
		} else {
			goto(`/create/${systemId}/origin`);
		}
	}

	const nextLabel = $derived(needsSubclass ? 'Next: Subclass' : 'Next: Origin');
</script>

<svelte:head>
	<title>Choose Class - OpenPentacle</title>
</svelte:head>

<div>
	<PageHeader
		as="h1"
		title="Choose Your Class"
		description="Your class defines your character's abilities, skills, and role in the party."
	/>

	<WizardNav
		nextLabel={nextLabel}
		onNext={proceed}
		nextDisabled={!selectedClassId}
		compact
	/>

	<div class="xl:flex xl:gap-6">
		<div class="xl:w-3/5">
			<div class="mt-4 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2" role="listbox" aria-label="Character classes" use:rovingTabindex>
				{#each classes as classDef}
					{@const Icon = classIcons[classDef.id] ?? BookOpen}
					<SelectionCard
						selected={selectedClassId === classDef.id}
						onclick={() => selectClass(classDef.id)}
					>
						<div class="flex items-start justify-between pr-6">
							<div class="flex items-center gap-2">
								<Icon class="size-4 text-muted-foreground" />
								<h3 class="font-semibold">{classDef.name}</h3>
							</div>
							<Badge variant="outline" class="text-xs">{classDef.hitDie}</Badge>
						</div>
						<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">
							{classDef.description}
						</p>
						<div class="mt-2 flex flex-wrap gap-1">
							{#each classDef.primaryAbility as ability}
								<Badge variant="secondary" class="text-xs">
									{ability.toUpperCase()}
								</Badge>
							{/each}
							{#if classDef.spellcasting}
								<Badge class="bg-primary/10 text-primary text-xs hover:bg-primary/10">
									Spellcaster
								</Badge>
							{/if}
						</div>
					</SelectionCard>
				{/each}
			</div>
		</div>

		<!-- Selected class details + level picker -->
		{#if selectedClass}
			<div class="mt-6 xl:mt-4 xl:w-2/5">
				<div class="xl:sticky xl:top-4 xl:max-h-[calc(100vh-2rem)] xl:overflow-y-auto xl:rounded-lg">
					<DetailPanel title={selectedClass.name}>
						<p class="text-sm text-muted-foreground">{selectedClass.description}</p>

						<div class="mt-4 grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-1">
							<div>
								<span class="font-medium">Hit Die:</span>
								<span class="text-muted-foreground"> {selectedClass.hitDie}</span>
							</div>
							<div>
								<span class="font-medium">Primary Ability:</span>
								<span class="text-muted-foreground"> {selectedClass.primaryAbility.map(a => a.toUpperCase()).join(', ')}</span>
							</div>
							<div>
								<span class="font-medium">Saving Throws:</span>
								<span class="text-muted-foreground"> {selectedClass.savingThrows.map(a => a.toUpperCase()).join(', ')}</span>
							</div>
							<div>
								<span class="font-medium">Armor:</span>
								<span class="text-muted-foreground"> {selectedClass.armorProficiencies.join(', ') || 'None'}</span>
							</div>
						</div>

						<Separator class="my-4" />

						<!-- Level Picker -->
						<div class="flex items-center gap-4">
							<Label for="level-input" class="text-sm font-medium">Character Level</Label>
							<Input
								id="level-input"
								type="number"
								min={1}
								max={20}
								value={selectedLevel}
								oninput={handleLevelInput}
								class="w-20"
							/>
							<span class="text-xs text-muted-foreground">1–20</span>
						</div>

						<!-- Feature Choices -->
						{#if featuresWithChoices.length > 0}
							<Separator class="my-4" />
							<h4 class="mb-3 text-sm font-medium">Feature Choices</h4>
							<div class="space-y-4">
								{#each featuresWithChoices as feature}
									{#each feature.choices ?? [] as choice}
										{@const searchKey = `${feature.id}:${choice.id}`}
										{@const searchText = featureSearchFilters[searchKey]?.toLowerCase() ?? ''}
										{@const showSearch = choice.options.length >= SEARCH_THRESHOLD}
										{@const selectedIds = getSelectedOptions(feature.id, choice.id)}
										{@const filteredOptions = searchText
											? choice.options.filter((o) => o.name.toLowerCase().includes(searchText) || selectedIds.includes(o.id))
											: choice.options}
										<div>
											<div class="mb-1.5 flex items-center gap-2">
												<span class="text-sm font-medium">{choice.name}</span>
												<Badge variant="outline" class="text-[10px] px-1.5 py-0">Lv{feature.level}</Badge>
												<span class="text-xs text-muted-foreground">
													{selectedIds.length}/{choice.count}
												</span>
											</div>
											<p class="mb-2 text-xs text-muted-foreground">{choice.description}</p>

											{#if showSearch}
												<div class="relative mb-2">
													<Search class="absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
													<input
														type="text"
														placeholder="Filter {choice.name.toLowerCase()}..."
														value={featureSearchFilters[searchKey] ?? ''}
														oninput={(e) => { featureSearchFilters[searchKey] = (e.target as HTMLInputElement).value; }}
														class="w-full rounded-md border border-border bg-background px-2.5 py-1.5 pl-7 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
													/>
												</div>
											{/if}

											<div class="flex flex-wrap gap-1.5">
												{#each filteredOptions as option}
													{@const isSelected = selectedIds.includes(option.id)}
													<button
														aria-pressed={isSelected}
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
												{#if searchText && filteredOptions.length === 0}
													<p class="text-xs text-muted-foreground py-1">No matches for "{featureSearchFilters[searchKey]}"</p>
												{/if}
											</div>
										</div>
									{/each}
								{/each}
							</div>
						{/if}

						<!-- Level features preview with expandable descriptions -->
						{#if featurePreview().length > 0}
							<Separator class="my-4" />
							<h4 class="mb-2 text-sm font-medium">Features by Level</h4>
							<div class="max-h-96 space-y-1 overflow-y-auto text-sm">
								{#each featurePreview() as row}
									<div class="{row.active ? '' : 'opacity-40'}">
										<div class="flex gap-2">
											<span class="w-16 shrink-0 font-mono text-xs text-muted-foreground pt-0.5">
												Level {row.level}
											</span>
											<div class="flex-1 space-y-0.5">
												{#each row.features as feat}
													{@const key = `L${row.level}-${feat.name}`}
													<button
														class="flex w-full items-center gap-1 text-left hover:text-primary"
														onclick={() => toggleFeature(key)}
													>
														{#if row.isSubclass && feat === row.features[0]}
															<Star class="inline size-3 shrink-0 text-amber-500" />
														{/if}
														{#if row.isASI && feat.name === 'Ability Score Improvement'}
															<Sparkles class="inline size-3 shrink-0 text-blue-500" />
														{/if}
														<span class="font-medium">{feat.name}</span>
														{#if expandedFeature === key}
															<ChevronUp class="ml-auto size-3 shrink-0 text-muted-foreground" />
														{:else}
															<ChevronDown class="ml-auto size-3 shrink-0 text-muted-foreground" />
														{/if}
													</button>
													{#if expandedFeature === key && feat.description}
														<p class="ml-4 pb-2 text-xs text-muted-foreground leading-relaxed">{feat.description}</p>
													{/if}
												{/each}
											</div>
										</div>
									</div>
								{/each}
							</div>
							<div class="mt-2 flex gap-4 text-xs text-muted-foreground">
								<span class="flex items-center gap-1"><Star class="size-3 text-amber-500" /> Subclass</span>
								<span class="flex items-center gap-1"><Sparkles class="size-3 text-blue-500" /> ASI</span>
							</div>
						{/if}
					</DetailPanel>
				</div>
			</div>
		{/if}
	</div>

	<WizardNav
		nextLabel={nextLabel}
		onNext={proceed}
		nextDisabled={!selectedClassId}
	/>
</div>
