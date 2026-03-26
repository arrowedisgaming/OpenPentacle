<script lang="ts">
	import type { PreparedSpellContext } from '$lib/engine/prepared-spells.js';
	import type { SpellDefinition } from '$lib/types/content-pack.js';
	import { formatSpellLevel } from '$lib/utils/format.js';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import * as Card from '$lib/components/ui/card';
	import { Lock, ChevronDown, ChevronUp, Search } from 'lucide-svelte';

	interface Props {
		context: PreparedSpellContext;
		currentPreparedIds: Set<string>;
		availableSpells: SpellDefinition[];
		onchange: (ids: Set<string>) => void;
	}

	let { context, currentPreparedIds, availableSpells, onchange }: Props = $props();

	let expandedSpellId = $state<string | null>(null);
	let searchQuery = $state('');
	let activeLevelFilters = $state<Set<number>>(new Set());
	let showPreparedOnly = $state(false);

	// Build a set of available spell IDs for fast lookup
	const availableSpellIds = $derived(new Set(availableSpells.map((s) => s.id)));

	// Count user-selected prepared spells — only count IDs that are in the available pool
	// (excludes cantrips which the wizard step puts in preparedSpellIds but aren't editable here)
	const userPreparedCount = $derived(
		[...currentPreparedIds].filter(
			(id) => !context.alwaysPreparedIds.has(id) && availableSpellIds.has(id)
		).length
	);

	// Get distinct spell levels present
	const distinctLevels = $derived(
		[...new Set(availableSpells.map((s) => s.level))].sort((a, b) => a - b)
	);

	// Filter spells by search + level + prepared filters
	const filteredSpells = $derived.by(() => {
		let spells = availableSpells;

		// Prepared-only filter
		if (showPreparedOnly) {
			spells = spells.filter(
				(s) => currentPreparedIds.has(s.id) || context.alwaysPreparedIds.has(s.id)
			);
		}

		// Level filter (empty = show all)
		if (activeLevelFilters.size > 0) {
			spells = spells.filter((s) => activeLevelFilters.has(s.level));
		}

		// Text search
		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			spells = spells.filter(
				(s) =>
					s.name.toLowerCase().includes(q) ||
					s.school.toLowerCase().includes(q)
			);
		}

		return spells;
	});

	function toggleLevelFilter(level: number) {
		const next = new Set(activeLevelFilters);
		if (next.has(level)) {
			next.delete(level);
		} else {
			next.add(level);
		}
		activeLevelFilters = next;
	}

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

		<!-- Level filter badges -->
		{#if distinctLevels.length > 0}
			<div class="mb-3 flex flex-wrap items-center gap-2">
				{#each distinctLevels as level}
					<button type="button" onclick={() => toggleLevelFilter(level)}>
						<Badge
							variant={activeLevelFilters.has(level) ? 'default' : 'outline'}
							class="cursor-pointer"
						>
							{formatSpellLevel(level)} Level
						</Badge>
					</button>
				{/each}
				<button type="button" onclick={() => { showPreparedOnly = !showPreparedOnly; }}>
					<Badge
						variant={showPreparedOnly ? 'default' : 'outline'}
						class="cursor-pointer"
					>
						Prepared
					</Badge>
				</button>
				{#if activeLevelFilters.size > 0 || showPreparedOnly}
					<button
						type="button"
						onclick={() => { activeLevelFilters = new Set(); showPreparedOnly = false; }}
						class="text-xs text-muted-foreground underline hover:text-foreground"
					>
						Clear Filters
					</button>
				{/if}
			</div>
		{/if}

		<!-- Search input -->
		<div class="relative mb-4">
			<Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Search spells..."
				bind:value={searchQuery}
				class="pl-9"
			/>
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
		{:else if searchQuery.trim() || activeLevelFilters.size > 0}
			<p class="text-sm text-muted-foreground text-center py-4">No spells match your filters.</p>
		{:else}
			<p class="text-sm text-muted-foreground text-center py-4">No spells available for preparation.</p>
		{/if}
	</Card.Content>
</Card.Root>
