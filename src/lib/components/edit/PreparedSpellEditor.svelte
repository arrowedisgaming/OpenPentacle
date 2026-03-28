<script lang="ts">
	import type { PreparedSpellContext } from '$lib/engine/prepared-spells.js';
	import type { SpellDefinition } from '$lib/types/content-pack.js';
	import { filterSpells, hasActiveFilters, EMPTY_FILTERS, type SpellFilters } from '$lib/engine/spells.js';
	import { formatSpellLevel } from '$lib/utils/format.js';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import { SpellFilterBar } from '$lib/components/ui/spell-filter-bar';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Lock, ChevronDown, ChevronUp } from 'lucide-svelte';

	interface Props {
		context: PreparedSpellContext;
		currentPreparedIds: Set<string>;
		availableSpells: SpellDefinition[];
		onchange: (ids: Set<string>) => void;
	}

	let { context, currentPreparedIds, availableSpells, onchange }: Props = $props();

	let expandedSpellId = $state<string | null>(null);
	let showPreparedOnly = $state(false);
	let spellFilters = $state<SpellFilters>({ ...EMPTY_FILTERS, schools: new Set(), levels: new Set() });

	// Build a set of available spell IDs for fast lookup
	const availableSpellIds = $derived(new Set(availableSpells.map((s) => s.id)));

	// Count user-selected prepared spells — only count IDs that are in the available pool
	// (excludes cantrips which the wizard step puts in preparedSpellIds but aren't editable here)
	const userPreparedCount = $derived(
		[...currentPreparedIds].filter(
			(id) => !context.alwaysPreparedIds.has(id) && availableSpellIds.has(id)
		).length
	);

	// Filter spells: prepared-only toggle (domain-specific) + shared filters
	const filteredSpells = $derived.by(() => {
		let spells = availableSpells;

		// Prepared-only filter (domain-specific, not part of shared SpellFilters)
		if (showPreparedOnly) {
			spells = spells.filter(
				(s) => currentPreparedIds.has(s.id) || context.alwaysPreparedIds.has(s.id)
			);
		}

		return filterSpells(spells, spellFilters);
	});

	const hasAnyFilters = $derived(showPreparedOnly || hasActiveFilters(spellFilters));

	function toggleSpell(spellId: string) {
		if (context.alwaysPreparedIds.has(spellId)) return;
		const next = new Set(currentPreparedIds);
		if (next.has(spellId)) {
			next.delete(spellId);
		} else {
			if (userPreparedCount >= context.maxPrepared) return;
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
		<Card.Title class="text-base">Prepared Spells</Card.Title>
		<p class="text-sm text-muted-foreground">
			{#if context.isSpellbookCaster}
				Preparing from Spellbook
			{:else}
				Preparing from {context.className} Spell List
			{/if}
		</p>
	</Card.Header>
	<Card.Content>
		<!-- Counter bar -->
		<div class="mb-4 flex items-center justify-center rounded-md border bg-muted/30 py-2">
			<div class="text-center">
				<div class="text-xs text-muted-foreground">Prepared</div>
				<div class="text-lg font-bold tabular-nums {userPreparedCount >= context.maxPrepared ? 'text-primary' : ''}">
					{userPreparedCount}<span class="text-muted-foreground font-normal text-sm">/{context.maxPrepared}</span>
				</div>
			</div>
			{#if context.alwaysPreparedIds.size > 0}
				<div class="ml-6 text-center">
					<div class="text-xs text-muted-foreground">Always Prepared</div>
					<div class="text-lg font-bold tabular-nums text-muted-foreground">
						{context.alwaysPreparedIds.size}
					</div>
				</div>
			{/if}
		</div>

		<!-- Spell filters -->
		<div class="mb-4">
			<SpellFilterBar spells={availableSpells} bind:filters={spellFilters} showLevels={true} />
			<div class="mt-1.5 flex flex-wrap items-center gap-1.5">
				<button
					type="button"
					onclick={() => { showPreparedOnly = !showPreparedOnly; }}
					aria-pressed={showPreparedOnly}
					aria-label="Show only prepared spells"
					class="rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
				>
					<Badge
						variant={showPreparedOnly ? 'default' : 'secondary'}
						class="cursor-pointer transition-colors"
					>
						Prepared Only
					</Badge>
				</button>
			</div>
		</div>

		<!-- Spell list -->
		{#if filteredSpells.length > 0}
			<div class="space-y-2">
				{#each filteredSpells as spell}
					{@const isAlwaysPrepared = context.alwaysPreparedIds.has(spell.id)}
					{@const isPrepared = isAlwaysPrepared || currentPreparedIds.has(spell.id)}
					{@const isExpanded = expandedSpellId === spell.id}
					<SelectionCard
						selected={isPrepared}
						disabled={isAlwaysPrepared}
						onclick={() => toggleSpell(spell.id)}
					>
						<div class="flex items-center gap-2 pr-6">
							{#if isAlwaysPrepared}
								<Lock class="size-3.5 text-muted-foreground" />
							{/if}
							<span class="font-medium">{spell.name}</span>
							<Badge variant="secondary" class="text-xs capitalize">{spell.school}</Badge>
							<Badge variant="outline" class="text-xs">{formatSpellLevel(spell.level)}</Badge>
							{#if spell.concentration}
								<Badge variant="outline" class="text-xs">C</Badge>
							{/if}
							{#if spell.ritual}
								<Badge variant="outline" class="text-xs">R</Badge>
							{/if}
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
								].filter(Boolean).join(', ') || '—'}{#if spell.components.materialCost}&nbsp;({spell.components.materialCost} gp){/if}
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
			<p class="text-sm text-muted-foreground text-center py-4">No spells match your filters.</p>
		{:else}
			<p class="text-sm text-muted-foreground text-center py-4">No spells available for preparation.</p>
		{/if}
	</Card.Content>
</Card.Root>
