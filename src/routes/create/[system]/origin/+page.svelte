<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { OriginLayer, OriginOption, OriginSubOption } from '$lib/types/content-pack.js';
	import type { OriginSelection, OriginChoice } from '$lib/types/character.js';
	import { ABILITY_NAMES } from '$lib/types/common.js';
	import type { AbilityId } from '$lib/types/common.js';
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

	// Restore existing choices from wizard store
	const existingOrigins = wizardStore.getCharacter()?.origins ?? [];

	// Track selections per layer
	let selections = $state<Record<string, { optionId: string; subOptionId?: string }>>(
		Object.fromEntries(
			existingOrigins.map((o) => [
				o.layerId,
				{ optionId: o.optionId, subOptionId: o.subOptionId }
			])
		)
	);

	// Track origin choices per layer
	let sizeSelections = $state<Record<string, string>>(
		Object.fromEntries(
			existingOrigins
				.filter((o) => o.choices.some((c) => c.choiceId === 'size'))
				.map((o) => [o.layerId, o.choices.find((c) => c.choiceId === 'size')!.selectedValues[0]])
		)
	);

	let spellAbilitySelections = $state<Record<string, string>>(
		Object.fromEntries(
			existingOrigins
				.filter((o) => o.choices.some((c) => c.choiceId === 'spellcasting-ability'))
				.map((o) => [o.layerId, o.choices.find((c) => c.choiceId === 'spellcasting-ability')!.selectedValues[0]])
		)
	);

	let skillSelections = $state<Record<string, string[]>>(
		Object.fromEntries(
			existingOrigins
				.filter((o) => o.choices.some((c) => c.choiceId === 'skill-proficiency'))
				.map((o) => [o.layerId, o.choices.find((c) => c.choiceId === 'skill-proficiency')!.selectedValues])
		)
	);

	function selectOption(layerId: string, optionId: string) {
		selections[layerId] = { optionId, subOptionId: undefined };
		// Clear associated choices when species changes
		delete sizeSelections[layerId];
		delete spellAbilitySelections[layerId];
		delete skillSelections[layerId];
	}

	function selectSubOption(layerId: string, subOptionId: string) {
		if (selections[layerId]) {
			selections[layerId] = { ...selections[layerId], subOptionId };
			// Clear spellcasting ability when sub-option changes (it may differ)
			delete spellAbilitySelections[layerId];
		}
	}

	function getSelectedOption(layer: OriginLayer): OriginOption | undefined {
		const sel = selections[layer.id];
		if (!sel) return undefined;
		return layer.options.find((o) => o.id === sel.optionId);
	}

	function getSelectedSubOption(layer: OriginLayer): OriginSubOption | undefined {
		const sel = selections[layer.id];
		if (!sel?.subOptionId) return undefined;
		const opt = getSelectedOption(layer);
		return opt?.subOptions?.find((s) => s.id === sel.subOptionId);
	}

	/** Whether sub-option spells need a spellcasting ability choice */
	function needsSpellAbilityChoice(layer: OriginLayer): boolean {
		const sub = getSelectedSubOption(layer);
		if (sub?.spells?.some((s) => s.spellcastingAbility === 'choice')) return true;
		return false;
	}

	/** Whether the species has a size choice */
	function needsSizeChoice(layer: OriginLayer): boolean {
		const opt = getSelectedOption(layer);
		return (opt?.sizeChoices?.length ?? 0) > 1;
	}

	/** Whether the species has a skill proficiency choice */
	function getSkillChoice(layer: OriginLayer) {
		const opt = getSelectedOption(layer);
		return opt?.proficiencies.find((p) => p.isChoice && p.type === 'skill');
	}

	/** Effective speed considering sub-option override */
	function getEffectiveSpeed(opt: OriginOption, sub?: OriginSubOption): number {
		return sub?.speed ?? opt.speed;
	}

	/** Effective darkvision considering sub-option override */
	function getEffectiveDarkvision(opt: OriginOption, sub?: OriginSubOption): number {
		return sub?.darkvision ?? opt.darkvision ?? 0;
	}

	const allChoicesComplete = $derived(
		originLayers.every((layer) => {
			const sel = selections[layer.id];
			if (!sel?.optionId) return false;
			const opt = getSelectedOption(layer);
			if (!opt) return false;
			// Sub-option required?
			if (opt.subOptions && opt.subOptions.length > 0 && !sel.subOptionId) return false;
			// Size required?
			if ((opt.sizeChoices?.length ?? 0) > 1 && !sizeSelections[layer.id]) return false;
			// Spellcasting ability required?
			if (needsSpellAbilityChoice(layer) && !spellAbilitySelections[layer.id]) return false;
			// Skill choice required?
			const skillChoice = getSkillChoice(layer);
			if (skillChoice) {
				const picked = skillSelections[layer.id] ?? [];
				if (picked.length < (skillChoice.choiceCount ?? 1)) return false;
			}
			return true;
		})
	);

	function proceed() {
		if (!allChoicesComplete) return;

		const origins: OriginSelection[] = originLayers.map((layer) => {
			const choices: OriginChoice[] = [];

			if (sizeSelections[layer.id]) {
				choices.push({ choiceId: 'size', selectedValues: [sizeSelections[layer.id]] });
			}
			if (spellAbilitySelections[layer.id]) {
				choices.push({ choiceId: 'spellcasting-ability', selectedValues: [spellAbilitySelections[layer.id]] });
			}
			if (skillSelections[layer.id]?.length) {
				choices.push({ choiceId: 'skill-proficiency', selectedValues: skillSelections[layer.id] });
			}

			return {
				layerId: layer.id,
				optionId: selections[layer.id].optionId,
				subOptionId: selections[layer.id].subOptionId,
				choices
			};
		});

		wizardStore.updateCharacter({ origins });
		wizardStore.completeStep();
		goto(`/create/${systemId}/abilities`);
	}

	function skillDisplayName(skillId: string): string {
		// kebab-case → Title Case with proper handling of multi-word skills
		return skillId.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
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
		nextDisabled={!allChoicesComplete}
		compact
	/>

	{#each originLayers as layer}
		{@const opt = getSelectedOption(layer)}
		{@const sub = getSelectedSubOption(layer)}
		<div class="mb-8">
			<PageHeader title={layer.name} description={layer.description} />

			<div class="mt-4 grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3" role="listbox" aria-label={layer.name} use:rovingTabindex>
				{#each layer.options as option}
					<SelectionCard
						selected={selections[layer.id]?.optionId === option.id}
						onclick={() => selectOption(layer.id, option.id)}
					>
						<div class="flex items-start justify-between pr-6">
							<h3 class="font-semibold">{option.name}</h3>
							<span class="text-xs text-muted-foreground">
								{option.sizeChoices ? option.sizeChoices.join('/') : option.size} &middot; {option.speed} ft
							</span>
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

			{#if opt}
				<!-- Sub-options (e.g., Elven Lineage, Draconic Ancestry) -->
				{#if opt.subOptions && opt.subOptions.length > 0}
					<div class="mt-6">
						<h3 class="text-lg font-medium">
							Choose {opt.subOptionLabel ?? `a ${opt.name} Subtype`}
						</h3>
						<div
							class="mt-3 grid gap-3 sm:grid-cols-2 {opt.subOptions.length > 4 ? 'lg:grid-cols-3' : ''}"
							role="listbox"
							aria-label={opt.subOptionLabel ?? 'Sub-options'}
							use:rovingTabindex
						>
							{#each opt.subOptions as subOpt}
								<SelectionCard
									selected={selections[layer.id]?.subOptionId === subOpt.id}
									onclick={() => selectSubOption(layer.id, subOpt.id)}
								>
									<h4 class="font-semibold">{subOpt.name}</h4>
									<p class="mt-1 text-sm text-muted-foreground">{subOpt.description}</p>
									{#if subOpt.damageResistance}
										<Badge variant="secondary" class="mt-2 text-xs capitalize">
											{subOpt.damageResistance} Resistance
										</Badge>
									{/if}
								</SelectionCard>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Size choice (Human, Tiefling) -->
				{#if needsSizeChoice(layer)}
					<div class="mt-6">
						<h3 class="text-lg font-medium">Choose Size</h3>
						<div class="mt-3 grid gap-3 sm:grid-cols-2" role="listbox" aria-label="Size" use:rovingTabindex>
							{#each opt.sizeChoices! as size}
								<SelectionCard
									selected={sizeSelections[layer.id] === size}
									onclick={() => { sizeSelections[layer.id] = size; }}
								>
									<h4 class="font-semibold">{size}</h4>
								</SelectionCard>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Spellcasting ability choice (Elf, Gnome, Tiefling lineages) -->
				{#if needsSpellAbilityChoice(layer)}
					{@const choices = sub?.spells?.find((s) => s.spellcastingAbilityChoices)?.spellcastingAbilityChoices ?? []}
					{#if choices.length > 0}
						<div class="mt-6">
							<h3 class="text-lg font-medium">Choose Spellcasting Ability</h3>
							<p class="mt-1 text-sm text-muted-foreground">
								This ability is used for the spells granted by your {opt.subOptionLabel ?? 'lineage'}.
							</p>
							<div class="mt-3 grid gap-3 sm:grid-cols-3" role="listbox" aria-label="Spellcasting Ability" use:rovingTabindex>
								{#each choices as ability}
									<SelectionCard
										selected={spellAbilitySelections[layer.id] === ability}
										onclick={() => { spellAbilitySelections[layer.id] = ability; }}
									>
										<h4 class="font-semibold">{ABILITY_NAMES[ability as AbilityId]}</h4>
									</SelectionCard>
								{/each}
							</div>
						</div>
					{/if}
				{/if}

				<!-- Skill proficiency choice (Elf Keen Senses, Human Skillful) -->
				{#if getSkillChoice(layer)}
					{@const skillChoice = getSkillChoice(layer)!}
					<div class="mt-6">
						<h3 class="text-lg font-medium">
							Choose Skill Proficiency{(skillChoice.choiceCount ?? 1) > 1 ? ` (pick ${skillChoice.choiceCount})` : ''}
						</h3>
						<div class="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-4" role="listbox" aria-label="Skill Proficiency" use:rovingTabindex>
							{#each skillChoice.choices ?? [] as skill}
								{@const picked = skillSelections[layer.id] ?? []}
								{@const isSelected = picked.includes(skill)}
								{@const maxReached = picked.length >= (skillChoice.choiceCount ?? 1)}
								<SelectionCard
									selected={isSelected}
									onclick={() => {
										const current = skillSelections[layer.id] ?? [];
										if (isSelected) {
											skillSelections[layer.id] = current.filter((s) => s !== skill);
										} else if (!maxReached) {
											skillSelections[layer.id] = [...current, skill];
										} else if ((skillChoice.choiceCount ?? 1) === 1) {
											skillSelections[layer.id] = [skill];
										}
									}}
								>
									<h4 class="text-sm font-medium">{skillDisplayName(skill)}</h4>
								</SelectionCard>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Selected option details -->
				<div class="mt-6">
					<DetailPanel title="{opt.name} Traits">
						<ul class="space-y-2 text-sm">
							{#each opt.traits as trait}
								<li>
									<span class="font-medium">{trait.name}.</span>
									<span class="text-muted-foreground"> {trait.description}</span>
								</li>
							{/each}
							{#if sub}
								{#each sub.traits as trait}
									<li>
										<span class="font-medium">{trait.name}.</span>
										<span class="text-muted-foreground"> {trait.description}</span>
									</li>
								{/each}
							{/if}
						</ul>

						{#if sub?.spells && sub.spells.length > 0}
							<div class="mt-3 border-t pt-3">
								<p class="text-sm font-medium">Species Spells</p>
								<ul class="mt-1 space-y-1 text-sm text-muted-foreground">
									{#each sub.spells as spell}
										{@const spellDef = pack.spells?.find((s: any) => s.id === spell.spellId)}
										<li>
											<span class="font-medium text-foreground">{spellDef?.name ?? spell.spellId}</span>
											{#if spell.level === 1}
												<span class="text-xs"> (Level 1)</span>
											{:else}
												<span class="text-xs"> (Level {spell.level})</span>
											{/if}
										</li>
									{/each}
								</ul>
							</div>
						{/if}

						{#if sub?.damageResistance}
							<p class="mt-2 text-sm">
								<span class="font-medium">Damage Resistance:</span>
								<span class="text-muted-foreground capitalize"> {sub.damageResistance}</span>
							</p>
						{/if}

						{#if opt.languages.length > 0}
							<p class="mt-2 text-sm">
								<span class="font-medium">Languages:</span>
								<span class="text-muted-foreground"> {opt.languages.join(', ')}</span>
							</p>
						{/if}

						{@const effectiveSpeed = getEffectiveSpeed(opt, sub)}
						{@const effectiveDv = getEffectiveDarkvision(opt, sub)}
						<div class="mt-2 flex gap-3 text-sm">
							<span>
								<span class="font-medium">Speed:</span>
								<span class="text-muted-foreground"> {effectiveSpeed} ft</span>
							</span>
							{#if effectiveDv > 0}
								<span>
									<span class="font-medium">Darkvision:</span>
									<span class="text-muted-foreground"> {effectiveDv} ft</span>
								</span>
							{/if}
						</div>
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
		nextDisabled={!allChoicesComplete}
	/>
</div>
