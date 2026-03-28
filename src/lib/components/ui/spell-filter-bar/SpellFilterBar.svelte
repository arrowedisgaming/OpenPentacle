<script lang="ts">
	import type { SpellDefinition } from '$lib/types/content-pack.js';
	import type { SpellSchool } from '$lib/types/common.js';
	import { type SpellFilters, EMPTY_FILTERS, hasActiveFilters, filterSpells } from '$lib/engine/spells.js';
	import { formatSpellLevel } from '$lib/utils/format.js';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Search } from 'lucide-svelte';

	interface Props {
		spells: SpellDefinition[];
		filters: SpellFilters;
		showSearch?: boolean;
		showSchools?: boolean;
		showLevels?: boolean;
		showConcentration?: boolean;
		showRitual?: boolean;
		class?: string;
	}

	let {
		spells,
		filters = $bindable(),
		showSearch = true,
		showSchools = true,
		showLevels = false,
		showConcentration = true,
		showRitual = true,
		class: className = ''
	}: Props = $props();

	// Derive available schools and levels from the spell list
	const availableSchools = $derived(
		[...new Set(spells.map((s) => s.school))].sort() as SpellSchool[]
	);
	const availableLevels = $derived(
		[...new Set(spells.map((s) => s.level))].sort((a, b) => a - b)
	);
	const hasConcentration = $derived(spells.some((s) => s.concentration));
	const hasRitual = $derived(spells.some((s) => s.ritual));

	const filtersActive = $derived(hasActiveFilters(filters));
	const filteredCount = $derived(filterSpells(spells, filters).length);

	function toggleSchool(school: SpellSchool) {
		const next = new Set(filters.schools);
		if (next.has(school)) next.delete(school);
		else next.add(school);
		filters = { ...filters, schools: next };
	}

	function toggleLevel(level: number) {
		const next = new Set(filters.levels);
		if (next.has(level)) next.delete(level);
		else next.add(level);
		filters = { ...filters, levels: next };
	}

	function toggleConcentration() {
		filters = { ...filters, concentration: filters.concentration === true ? null : true };
	}

	function toggleRitual() {
		filters = { ...filters, ritual: filters.ritual === true ? null : true };
	}

	function clearFilters() {
		filters = { ...EMPTY_FILTERS, schools: new Set(), levels: new Set() };
	}
</script>

<div class={className} role="search" aria-label="Spell filters">
	{#if showSearch}
		<div class="relative mb-3">
			<Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
			<Input
				type="text"
				placeholder="Search by name or school..."
				value={filters.search}
				oninput={(e) => { filters = { ...filters, search: e.currentTarget.value }; }}
				class="pl-9"
			/>
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-1.5">
		{#if showSchools}
			{#each availableSchools as school}
				<button
					type="button"
					onclick={() => toggleSchool(school)}
					aria-pressed={filters.schools.has(school)}
					aria-label="Filter by {school}"
					class="rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
				>
					<Badge
						variant={filters.schools.has(school) ? 'default' : 'secondary'}
						class="cursor-pointer capitalize transition-colors"
					>
						{school}
					</Badge>
				</button>
			{/each}
		{/if}

		{#if showConcentration && hasConcentration}
			<button
				type="button"
				onclick={toggleConcentration}
				aria-pressed={filters.concentration === true}
				aria-label="Filter by concentration"
				class="rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
			>
				<Badge
					variant={filters.concentration === true ? 'default' : 'secondary'}
					class="cursor-pointer transition-colors"
				>
					Concentration
				</Badge>
			</button>
		{/if}

		{#if showRitual && hasRitual}
			<button
				type="button"
				onclick={toggleRitual}
				aria-pressed={filters.ritual === true}
				aria-label="Filter by ritual"
				class="rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
			>
				<Badge
					variant={filters.ritual === true ? 'default' : 'secondary'}
					class="cursor-pointer transition-colors"
				>
					Ritual
				</Badge>
			</button>
		{/if}

		{#if showLevels && availableLevels.length > 1}
			{#each availableLevels as level}
				<button
					type="button"
					onclick={() => toggleLevel(level)}
					aria-pressed={filters.levels.has(level)}
					aria-label="Filter by {level === 0 ? 'cantrips' : `${formatSpellLevel(level)} level spells`}"
					class="rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
				>
					<Badge
						variant={filters.levels.has(level) ? 'default' : 'secondary'}
						class="cursor-pointer transition-colors"
					>
						{level === 0 ? 'Cantrip' : `${formatSpellLevel(level)} Level`}
					</Badge>
				</button>
			{/each}
		{/if}

		{#if filtersActive}
			<button
				type="button"
				onclick={clearFilters}
				aria-label="Clear all filters"
				class="rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
			>
				<Badge variant="outline" class="cursor-pointer transition-colors hover:bg-accent">
					Clear
				</Badge>
			</button>
			<span class="text-xs text-muted-foreground ml-auto tabular-nums">
				{filteredCount} of {spells.length}
			</span>
		{/if}
	</div>
</div>
