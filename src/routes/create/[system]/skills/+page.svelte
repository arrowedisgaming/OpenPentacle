<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { ClassDefinition, BackgroundDefinition } from '$lib/types/content-pack.js';
	import type { SkillSelection } from '$lib/types/character.js';
	import type { SkillId } from '$lib/types/common.js';
	import { SKILL_ABILITIES } from '$lib/types/common.js';
	import { computeSkillChoiceContext, getSelectableSkills } from '$lib/engine/skills.js';
	import { kebabToTitle } from '$lib/utils/format.js';
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
			{#if skillCtx && skillCtx.overlapSkills.length > 0}
				<Badge variant="outline" class="text-amber-600 dark:text-amber-400">
					{skillCtx.overlapSkills.length} overlap — choose replacements from expanded list
				</Badge>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Background skills (read-only) -->
	{#if skillCtx && skillCtx.backgroundSkills.length > 0}
		<div class="mt-6">
			<h3 class="text-sm font-medium text-muted-foreground">Background Skills (auto-granted)</h3>
			<div class="mt-2 flex flex-wrap gap-2">
				{#each skillCtx.backgroundSkills as skillId}
					<Badge variant="secondary" class="px-3 py-1.5 text-sm">
						{kebabToTitle(skillId)}
						<span class="ml-1 text-xs opacity-60">({abilityAbbr(skillId)})</span>
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
					<SelectionCard
						selected={selectedSkillIds.has(skillId)}
						onclick={() => toggleSkill(skillId)}
						compact
					>
						<div class="flex items-center gap-2 pr-6">
							<span class="font-medium text-sm">{kebabToTitle(skillId)}</span>
							<span class="text-xs text-muted-foreground">({abilityAbbr(skillId)})</span>
						</div>
						{#if !isClassPool}
							<Badge variant="outline" class="mt-1 text-xs text-amber-600 dark:text-amber-400">
								Replacement
							</Badge>
						{/if}
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
