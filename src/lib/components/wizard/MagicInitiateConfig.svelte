<script lang="ts">
	import type { SpellDefinition } from '$lib/types/content-pack.js';
	import type { FeatSpellConfig } from '$lib/engine/feats.js';
	import type { AbilityId } from '$lib/types/common.js';
	import { ABILITY_NAMES } from '$lib/types/common.js';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { ChevronDown, ChevronUp } from 'lucide-svelte';

	let {
		spells,
		spellListOptions = ['cleric', 'druid', 'wizard'],
		lockedSpellList,
		usedSpellLists = new Set<string>(),
		config = $bindable(),
		onchange
	}: {
		spells: SpellDefinition[];
		spellListOptions?: string[];
		lockedSpellList?: string;
		usedSpellLists?: Set<string>;
		config: FeatSpellConfig;
		onchange?: () => void;
	} = $props();

	const CASTING_ABILITIES: AbilityId[] = ['int', 'wis', 'cha'];

	let expandedSpellId = $state<string | null>(null);

	function getSpellsForList(listId: string, level: number): SpellDefinition[] {
		return spells.filter((s) => s.lists.includes(listId) && s.level === level);
	}

	$effect(() => {
		if (lockedSpellList && config.spellList !== lockedSpellList) {
			config.spellList = lockedSpellList;
		}
	});

	let availableCantrips = $derived(
		config.spellList ? getSpellsForList(config.spellList, 0) : []
	);

	let availableSpells = $derived(
		config.spellList ? getSpellsForList(config.spellList, 1) : []
	);

	function selectSpellList(listId: string) {
		if (lockedSpellList || usedSpellLists.has(listId)) return;
		config.spellList = listId;
		config.cantrips = new Set<string>();
		config.spell = '';
		config.spellcastingAbility = '';
		expandedSpellId = null;
		onchange?.();
	}

	function toggleCantrip(spellId: string) {
		const next = new Set(config.cantrips);
		if (next.has(spellId)) {
			next.delete(spellId);
		} else if (next.size < 2) {
			next.add(spellId);
		}
		config.cantrips = next;
		onchange?.();
	}

	function selectSpell(spellId: string) {
		config.spell = spellId;
		onchange?.();
	}

	function selectAbility(ability: AbilityId) {
		config.spellcastingAbility = ability;
		onchange?.();
	}

	function toggleExpand(spellId: string, event: MouseEvent) {
		event.stopPropagation();
		expandedSpellId = expandedSpellId === spellId ? null : spellId;
	}

	function formatComponents(spell: SpellDefinition): string {
		const parts = [
			spell.components.verbal ? 'V' : '',
			spell.components.somatic ? 'S' : '',
			spell.components.material
				? spell.components.materialDescription
					? `M (${spell.components.materialDescription})`
					: 'M'
				: ''
		].filter(Boolean);
		return parts.join(', ') || '—';
	}

	export function isComplete(): boolean {
		return (
			config.spellList !== '' &&
			config.cantrips.size === 2 &&
			config.spell !== '' &&
			config.spellcastingAbility !== ''
		);
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Magic Initiate Configuration</Card.Title>
	</Card.Header>
	<Card.Content class="space-y-4">
		<!-- Spell List -->
		<div class="space-y-2">
			<p class="text-xs font-medium text-muted-foreground">Spell List</p>
			<div class="flex flex-wrap gap-2">
				{#each spellListOptions as listId}
					{@const isLocked = lockedSpellList === listId}
					{@const isUsed = usedSpellLists.has(listId)}
					{@const isSelected = config.spellList === listId}
					{@const isDisabled = !!lockedSpellList || isUsed}
					<button
						type="button"
						disabled={isDisabled}
						onclick={() => selectSpellList(listId)}
						class="rounded-md border px-3 py-1.5 text-sm capitalize transition-colors
							{isSelected || isLocked
							? 'border-primary bg-accent font-medium'
							: 'border-border hover:bg-accent/50'}
							{isDisabled ? 'opacity-40 cursor-not-allowed' : ''}"
					>
						{listId}
					</button>
				{/each}
			</div>
		</div>

		{#if config.spellList}
			<!-- Cantrips -->
			<div class="space-y-2">
				<p class="text-xs font-medium text-muted-foreground">
					Choose 2 Cantrips ({config.cantrips.size}/2)
				</p>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each availableCantrips as spell}
						{@const isExpanded = expandedSpellId === spell.id}
						<SelectionCard
							compact
							selected={config.cantrips.has(spell.id)}
							disabled={!config.cantrips.has(spell.id) && config.cantrips.size >= 2}
							onclick={() => toggleCantrip(spell.id)}
						>
							<div class="flex items-center gap-2 pr-6">
								<span class="text-sm font-medium">{spell.name}</span>
								<Badge variant="secondary" class="text-xs capitalize">{spell.school}</Badge>
								{#if spell.concentration}
									<Badge variant="outline" class="text-xs">C</Badge>
								{/if}
							</div>
							<p class="{isExpanded ? '' : 'line-clamp-2'} mt-1 text-xs text-muted-foreground">{spell.description}</p>
							<div class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
								<span>
									{spell.castingTime} &middot; {spell.range} &middot; {spell.duration}
									&middot; {[
										spell.components.verbal ? 'V' : '',
										spell.components.somatic ? 'S' : '',
										spell.components.material ? 'M' : ''
									].filter(Boolean).join(', ') || '—'}{#if spell.components.materialCost}&nbsp;({spell.components.materialCost} gp){/if}
								</span>
								<button
									type="button"
									aria-label={isExpanded ? 'Collapse spell details' : 'Expand spell details'}
									onclick={(e) => toggleExpand(spell.id, e)}
									class="ml-auto inline-flex items-center gap-0.5 text-primary/60 hover:text-primary"
								>
									{#if isExpanded}
										<ChevronUp class="size-3.5" />
									{:else}
										<ChevronDown class="size-3.5" />
									{/if}
								</button>
							</div>
							{#if isExpanded && spell.components.material && spell.components.materialDescription}
								<p class="mt-1 text-xs text-muted-foreground italic">Materials: {spell.components.materialDescription}</p>
							{/if}
						</SelectionCard>
					{/each}
				</div>
			</div>

			<!-- Level 1 Spell -->
			<div class="space-y-2">
				<p class="text-xs font-medium text-muted-foreground">
					Choose 1 Level 1 Spell ({config.spell ? 1 : 0}/1)
				</p>
				<div class="grid gap-2 sm:grid-cols-2">
					{#each availableSpells as spell}
						{@const isExpanded = expandedSpellId === spell.id}
						<SelectionCard
							compact
							selected={config.spell === spell.id}
							onclick={() => selectSpell(spell.id)}
						>
							<div class="flex items-center gap-2 pr-6">
								<span class="text-sm font-medium">{spell.name}</span>
								<Badge variant="secondary" class="text-xs capitalize">{spell.school}</Badge>
								{#if spell.concentration}
									<Badge variant="outline" class="text-xs">C</Badge>
								{/if}
								{#if spell.ritual}
									<Badge variant="outline" class="text-xs">R</Badge>
								{/if}
							</div>
							<p class="{isExpanded ? '' : 'line-clamp-2'} mt-1 text-xs text-muted-foreground">{spell.description}</p>
							<div class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
								<span>
									{spell.castingTime} &middot; {spell.range} &middot; {spell.duration}
									&middot; {[
										spell.components.verbal ? 'V' : '',
										spell.components.somatic ? 'S' : '',
										spell.components.material ? 'M' : ''
									].filter(Boolean).join(', ') || '—'}{#if spell.components.materialCost}&nbsp;({spell.components.materialCost} gp){/if}
								</span>
								<button
									type="button"
									aria-label={isExpanded ? 'Collapse spell details' : 'Expand spell details'}
									onclick={(e) => toggleExpand(spell.id, e)}
									class="ml-auto inline-flex items-center gap-0.5 text-primary/60 hover:text-primary"
								>
									{#if isExpanded}
										<ChevronUp class="size-3.5" />
									{:else}
										<ChevronDown class="size-3.5" />
									{/if}
								</button>
							</div>
							{#if isExpanded && spell.components.material && spell.components.materialDescription}
								<p class="mt-1 text-xs text-muted-foreground italic">Materials: {spell.components.materialDescription}</p>
							{/if}
						</SelectionCard>
					{/each}
				</div>
				<p class="text-sm italic text-muted-foreground">
					You always have the chosen level 1 spell prepared. You can cast it once without a spell
					slot, and you regain the ability to do so when you finish a Long Rest. You can also cast
					the spell using any spell slots you have.
				</p>
			</div>

			<!-- Spellcasting Ability -->
			<div class="space-y-2">
				<p class="text-xs font-medium text-muted-foreground">Spellcasting Ability</p>
				<div class="flex flex-wrap gap-2">
					{#each CASTING_ABILITIES as ability}
						<button
							type="button"
							onclick={() => selectAbility(ability)}
							class="rounded-md border px-3 py-1.5 text-sm transition-colors
								{config.spellcastingAbility === ability
								? 'border-primary bg-accent font-medium'
								: 'border-border hover:bg-accent/50'}"
						>
							{ABILITY_NAMES[ability]}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
