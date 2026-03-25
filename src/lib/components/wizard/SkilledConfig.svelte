<script lang="ts">
	import type { SkillId } from '$lib/types/common.js';
	import { ABILITY_NAMES, SKILL_ABILITIES } from '$lib/types/common.js';
	import { SKILL_EXAMPLES } from '$lib/engine/skills.js';
	import { kebabToTitle } from '$lib/utils/format.js';

	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';

	let {
		usedProficiencies = new Set<string>(),
		selections = $bindable(new Set<string>()),
		onchange,
	}: {
		usedProficiencies?: Set<string>;
		selections: Set<string>;
		onchange?: () => void;
	} = $props();

	const TOOL_PROFICIENCIES = [
		'thieves-tools', 'herbalism-kit', 'poisoners-kit', 'navigators-tools',
		'tinkers-tools', 'smiths-tools', 'brewers-supplies', 'cooks-utensils',
		'painters-supplies', 'calligraphers-supplies'
	] as const;

	const ALL_SKILL_IDS = Object.keys(SKILL_ABILITIES) as SkillId[];

	const allProficiencyOptions = $derived.by(() => {
		const skills = ALL_SKILL_IDS.map((id) => ({
			id: `skill:${id}`,
			label: kebabToTitle(id),
			group: 'Skill' as const,
			description: SKILL_EXAMPLES[id] ?? '',
			abilityAbbr: ABILITY_NAMES[SKILL_ABILITIES[id as SkillId]]?.slice(0, 3).toUpperCase() ?? ''
		}));
		const tools = TOOL_PROFICIENCIES.map((id) => ({
			id: `tool:${id}`,
			label: kebabToTitle(id),
			group: 'Tool' as const,
			description: 'Proficiency with this tool set.',
			abilityAbbr: ''
		}));
		return [...skills, ...tools];
	});

	const alreadyProficient = $derived(allProficiencyOptions.filter((p) => usedProficiencies.has(p.id)));
	const available = $derived(allProficiencyOptions.filter((p) => !usedProficiencies.has(p.id)));

	function toggleProficiency(profId: string) {
		const newSet = new Set(selections);
		if (newSet.has(profId)) {
			newSet.delete(profId);
		} else if (newSet.size < 3) {
			newSet.add(profId);
		}
		selections = newSet;
		onchange?.();
	}
</script>

<Card.Root>
	<Card.Header>
		<div class="flex items-center justify-between">
			<Card.Title>Skilled — Choose 3 Proficiencies</Card.Title>
			<Badge variant={selections.size === 3 ? 'default' : 'secondary'}>
				{selections.size} / 3 selected
			</Badge>
		</div>
	</Card.Header>
	<Card.Content>
		{#if alreadyProficient.length > 0}
			<h4 class="text-xs font-medium text-muted-foreground mb-2">Already Proficient</h4>
			<div class="flex flex-wrap gap-2 mb-4">
				{#each alreadyProficient as prof}
					<Badge variant="outline" class="opacity-60">
						{prof.label}{#if prof.abilityAbbr} ({prof.abilityAbbr}){/if} — Already Proficient
					</Badge>
				{/each}
			</div>
		{/if}

		<h4 class="text-xs font-medium text-muted-foreground mb-2">Available ({available.length})</h4>
		<div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="listbox" aria-label="Proficiency options">
			{#each available as prof}
				<SelectionCard
					compact
					selected={selections.has(prof.id)}
					disabled={!selections.has(prof.id) && selections.size >= 3}
					onclick={() => toggleProficiency(prof.id)}
				>
					<div class="font-medium text-sm">
						{prof.label}{#if prof.abilityAbbr} <span class="text-muted-foreground">({prof.abilityAbbr})</span>{/if}
					</div>
					{#if prof.description}
						<p class="text-xs text-muted-foreground mt-1">{prof.description}</p>
					{/if}
				</SelectionCard>
			{/each}
		</div>
	</Card.Content>
</Card.Root>
