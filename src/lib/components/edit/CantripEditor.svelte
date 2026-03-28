<script lang="ts">
	import type { SpellDefinition } from '$lib/types/content-pack.js';
	import { filterSpells, hasActiveFilters, EMPTY_FILTERS, type SpellFilters } from '$lib/engine/spells.js';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import { SpellFilterBar } from '$lib/components/ui/spell-filter-bar';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { ChevronDown, ChevronUp } from 'lucide-svelte';

	interface Props {
		maxCantrips: number;
		currentCantripIds: Set<string>;
		availableCantrips: SpellDefinition[];
		onchange: (ids: Set<string>) => void;
	}

	let { maxCantrips, currentCantripIds, availableCantrips, onchange }: Props = $props();

	let expandedSpellId = $state<string | null>(null);
	let spellFilters = $state<SpellFilters>({ ...EMPTY_FILTERS, schools: new Set(), levels: new Set() });

	const selectedCount = $derived(currentCantripIds.size);

	const filteredCantrips = $derived(filterSpells(availableCantrips, spellFilters));
	const hasAnyFilters = $derived(hasActiveFilters(spellFilters));

	function toggleCantrip(spellId: string) {
		const next = new Set(currentCantripIds);
		if (next.has(spellId)) {
			next.delete(spellId);
		} else {
			if (selectedCount >= maxCantrips) return;
			next.add(spellId);
		}
		onchange(next);
	}

	function toggleExpand(spellId: string, event: MouseEvent) {
		event.stopPropagation();
		expandedSpellId = expandedSpellId === spellId ? null : spellId;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title class="text-base">Cantrips</Card.Title>
		<p class="text-sm text-muted-foreground">
			Wizards can replace one cantrip on each Long Rest
		</p>
	</Card.Header>
	<Card.Content>
		<!-- Counter bar -->
		<div class="mb-4 flex items-center justify-center rounded-md border bg-muted/30 py-2">
			<div class="text-center">
				<div class="text-xs text-muted-foreground">Known</div>
				<div class="text-lg font-bold tabular-nums {selectedCount >= maxCantrips ? 'text-primary' : ''}">
					{selectedCount}<span class="text-muted-foreground font-normal text-sm">/{maxCantrips}</span>
				</div>
			</div>
		</div>

		<!-- Filters -->
		<div class="mb-4">
			<SpellFilterBar
				spells={availableCantrips}
				bind:filters={spellFilters}
				showLevels={false}
				showConcentration={false}
				showRitual={false}
			/>
		</div>

		<!-- Cantrip list -->
		{#if filteredCantrips.length > 0}
			<div class="space-y-2">
				{#each filteredCantrips as spell}
					{@const isSelected = currentCantripIds.has(spell.id)}
					{@const isExpanded = expandedSpellId === spell.id}
					{@const isDisabled = !isSelected && selectedCount >= maxCantrips}
					<SelectionCard
						selected={isSelected}
						disabled={isDisabled}
						onclick={() => toggleCantrip(spell.id)}
					>
						<div class="flex items-center gap-2 pr-6">
							<span class="font-medium">{spell.name}</span>
							<Badge variant="secondary" class="text-xs capitalize">{spell.school}</Badge>
						</div>
						<p class="{isExpanded ? '' : 'line-clamp-2'} mt-1 text-sm text-muted-foreground">
							{spell.description}
						</p>
						{#if spell.higherLevels && isExpanded}
							<p class="mt-1 text-sm text-muted-foreground italic">{spell.higherLevels}</p>
						{/if}
						<div class="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
							<span>
								{spell.castingTime} &middot; {spell.range} &middot; {spell.duration}
								&middot; {[
									spell.components.verbal ? 'V' : '',
									spell.components.somatic ? 'S' : '',
									spell.components.material ? 'M' : ''
								].filter(Boolean).join(', ') || '—'}
							</span>
							<button
								type="button"
								onclick={(e) => toggleExpand(spell.id, e)}
								class="ml-auto inline-flex items-center gap-0.5 text-primary/60 hover:text-primary"
								aria-label={isExpanded ? 'Collapse spell details' : 'Expand spell details'}
								aria-expanded={isExpanded}
							>
								{#if isExpanded}
									<ChevronUp class="size-3.5" />
								{:else}
									<ChevronDown class="size-3.5" />
								{/if}
							</button>
						</div>
					</SelectionCard>
				{/each}
			</div>
		{:else if hasAnyFilters}
			<p class="text-sm text-muted-foreground text-center py-4">No cantrips match your filters.</p>
		{:else}
			<p class="text-sm text-muted-foreground text-center py-4">No cantrips available.</p>
		{/if}
	</Card.Content>
</Card.Root>
