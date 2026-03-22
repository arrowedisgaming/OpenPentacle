<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getContext, onDestroy } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { ClassDefinition, BackgroundDefinition } from '$lib/types/content-pack.js';
	import type { SkillSelection } from '$lib/types/character.js';
	import type { AbilityId, SkillId } from '$lib/types/common.js';
	import { SKILL_ABILITIES, ABILITY_NAMES } from '$lib/types/common.js';
	import { computeSkillChoiceContext, getSelectableSkills } from '$lib/engine/skills.js';
	import { allAbilityTotals, allAbilityModifiers } from '$lib/engine/ability-scores.js';
	import { kebabToTitle, formatModifier } from '$lib/utils/format.js';
	import { Separator } from '$lib/components/ui/separator';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { rovingTabindex } from '$lib/actions/roving-tabindex.js';

	const wizNav = getContext<any>('wizard-nav');

	const { pack, systemId } = $derived($page.data as { pack: any; systemId: string });
	const classes: ClassDefinition[] = $derived(pack?.classes ?? []);
	const backgrounds: BackgroundDefinition[] = $derived(pack?.backgrounds ?? []);

	const character = $derived(wizardStore.getCharacter());
	const classId = $derived(character?.classes[0]?.classId ?? '');
	const classDef = $derived(classes.find((c) => c.id === classId));
	const backgroundDef = $derived(
		character?.background
			? backgrounds.find((b) => b.id === character!.background!.backgroundId) ?? null
			: null
	);

	// Compute skill context from engine
	const skillCtx = $derived(classDef ? computeSkillChoiceContext(classDef, backgroundDef) : null);
	const selectableSkills = $derived(skillCtx ? getSelectableSkills(skillCtx) : []);

	// Initialize selected skills from existing character data (for back-nav)
	let selectedSkillIds = $state<Set<SkillId>>(
		new Set(
			(wizardStore.getCharacter()?.skills ?? [])
				.filter((s) => s.source.startsWith('class:'))
				.map((s) => s.skillId)
		)
	);

	const selectedCount = $derived(selectedSkillIds.size);
	const maxCount = $derived(skillCtx?.classChoiceCount ?? 0);

	function toggleSkill(skillId: SkillId) {
		const newSet = new Set(selectedSkillIds);
		if (newSet.has(skillId)) {
			newSet.delete(skillId);
		} else {
			if (selectedCount >= maxCount) return;
			newSet.add(skillId);
		}
		selectedSkillIds = newSet;
	}

	const nextPath = $derived(wizNav.getNextStepPath('skills'));
	const nextLabel = $derived(`Next: ${wizNav.getNextStepLabel('skills')}`);
	const prevPath = $derived(wizNav.getPrevStepPath('skills'));

	function proceed() {
		if (!skillCtx) return;

		const skills: SkillSelection[] = [];

		// Background-granted skills
		for (const skillId of skillCtx.backgroundSkills) {
			skills.push({
				skillId,
				proficiency: 'proficient',
				source: `background:${character?.background?.backgroundId ?? 'unknown'}`
			});
		}

		// Class-chosen skills
		for (const skillId of selectedSkillIds) {
			skills.push({
				skillId,
				proficiency: 'proficient',
				source: `class:${classId}`
			});
		}

		wizardStore.updateCharacter({ skills });
		wizardStore.completeStep();
		goto(`/create/${systemId}/${nextPath}`);
	}

	function abilityAbbr(skillId: SkillId): string {
		return SKILL_ABILITIES[skillId].toUpperCase();
	}

	const SKILL_EXAMPLES: Record<SkillId, string> = {
		acrobatics: 'Stay on your feet in a tricky situation, or perform an acrobatic stunt.',
		'animal-handling': 'Calm or train an animal, or get an animal to behave in a certain way.',
		arcana: 'Recall lore about spells, magic items, and the planes of existence.',
		athletics: 'Jump farther than normal, stay afloat in rough water, or break something.',
		deception: 'Tell a convincing lie, or wear a disguise convincingly.',
		history: 'Recall lore about historical events, people, nations, and cultures.',
		insight: "Discern a person's mood and intentions.",
		intimidation: 'Awe or threaten someone into doing what you want.',
		investigation: 'Find obscure information in books, or deduce how something works.',
		medicine: 'Diagnose an illness, or determine what killed the recently slain.',
		nature: 'Recall lore about terrain, plants, animals, and weather.',
		perception: "Using a combination of senses, notice something that's easy to miss.",
		performance: 'Act, tell a story, perform music, or dance.',
		persuasion: 'Honestly and graciously convince someone of something.',
		religion: 'Recall lore about gods, religious rituals, and holy symbols.',
		'sleight-of-hand': 'Pick a pocket, conceal a handheld object, or perform legerdemain.',
		stealth: 'Escape notice by moving quietly and hiding behind things.',
		survival: 'Follow tracks, forage, find a trail, or avoid natural hazards.'
	};

	// Reactive store for ability score preview
	let wizChar = $state(wizardStore.getCharacter());
	const unsubWiz = wizardStore.subscribe((s) => { wizChar = s.character; });
	onDestroy(unsubWiz);

	const abilityMods = $derived(
		wizChar?.abilityScores?.method ? allAbilityModifiers(wizChar.abilityScores) : null
	);
	const abilityTotals = $derived(
		wizChar?.abilityScores?.method ? allAbilityTotals(wizChar.abilityScores) : null
	);
	const profBonus = $derived(wizChar?.level ? Math.ceil(wizChar.level / 4) + 1 : 2);
	const previewAbilities: AbilityId[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

	// Expected skill bonus: ability mod + proficiency bonus if proficient
	function skillBonus(skillId: SkillId, proficient: boolean): string {
		if (!abilityMods) return '';
		const ability = SKILL_ABILITIES[skillId];
		const mod = abilityMods[ability];
		const total = proficient ? mod + profBonus : mod;
		return formatModifier(total);
	}
</script>

<svelte:head>
	<title>Skills - OpenPentacle</title>
</svelte:head>

<div>
	<PageHeader
		as="h1"
		title="Choose Skill Proficiencies"
		description="Select the skills your character is proficient in."
	/>

	<WizardNav
		backHref="/create/{systemId}/{prevPath}"
		backLabel="Back"
		nextLabel={nextLabel}
		onNext={proceed}
		nextDisabled={selectedCount < maxCount}
		compact
	/>

	<!-- Counter badge -->
	<Card.Root class="mt-4">
		<Card.Content class="flex flex-wrap items-center gap-4 py-3">
			<Badge variant="secondary">
				Class Skills: <strong class="ml-1">{selectedCount}</strong> / {maxCount}
			</Badge>
			{#if skillCtx && skillCtx.backgroundSkills.length > 0}
				<Badge variant="outline">
					Background: {skillCtx.backgroundSkills.length} auto-granted
				</Badge>
			{/if}
			</Card.Content>
	</Card.Root>

	<!-- Stats Preview -->
	{#if abilityTotals && abilityMods}
		<div class="mt-4 rounded-lg border border-border bg-card p-3">
			<div class="grid grid-cols-6 gap-1.5 text-center">
				{#each previewAbilities as ability}
					<div class="flex flex-col items-center">
						<span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{ability}</span>
						<span class="text-lg font-bold leading-tight">{formatModifier(abilityMods[ability])}</span>
						<span class="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-medium">{abilityTotals[ability]}</span>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Background skills (read-only) -->
	{#if skillCtx && skillCtx.backgroundSkills.length > 0}
		<div class="mt-6">
			<h3 class="text-sm font-medium text-muted-foreground">Background Skills (auto-granted)</h3>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each skillCtx.backgroundSkills as skillId}
					<Badge variant="secondary" class="px-3 py-1.5 text-sm">
						{kebabToTitle(skillId)}
						<span class="ml-1 text-xs opacity-60">({abilityAbbr(skillId)})</span>
						{#if abilityMods}
							<span class="ml-1 font-mono text-xs font-bold">{skillBonus(skillId, true)}</span>
						{/if}
					</Badge>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Class skill choices -->
	{#if selectableSkills.length > 0}
		<div class="mt-6">
			<h3 class="text-sm font-medium text-muted-foreground">
				Choose {maxCount} from the list below
			</h3>
			<div class="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="listbox" aria-label="Skill choices" use:rovingTabindex>
				{#each selectableSkills as skillId}
					{@const isClassPool = skillCtx?.classChoicePool.includes(skillId)}
					{@const isProficient = selectedSkillIds.has(skillId)}
					<SelectionCard
						selected={isProficient}
						onclick={() => toggleSkill(skillId)}
						compact
					>
						<div class="flex items-center gap-2 pr-6">
							<span class="font-medium text-sm">{kebabToTitle(skillId)}</span>
							<span class="text-xs text-muted-foreground">({abilityAbbr(skillId)})</span>
							{#if abilityMods}
								<span class="ml-auto font-mono text-sm font-bold {isProficient ? 'text-primary' : 'text-muted-foreground'}">{skillBonus(skillId, isProficient)}</span>
							{/if}
						</div>
						<p class="mt-0.5 text-xs text-muted-foreground leading-relaxed">{SKILL_EXAMPLES[skillId]}</p>
					</SelectionCard>
				{/each}
			</div>
		</div>
	{/if}

	<WizardNav
		backHref="/create/{systemId}/{prevPath}"
		backLabel="Back"
		nextLabel={nextLabel}
		onNext={proceed}
		nextDisabled={selectedCount < maxCount}
	/>
</div>
