<script lang="ts">
	import { onMount } from 'svelte';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import LoadingState from '$lib/components/ui/loading-state/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/empty-state/EmptyState.svelte';

	interface Open5eSourceInfo {
		key: string;
		displayName: string;
		publisher: string;
		gameSystem: string;
		spellCount: number;
	}

	type Props = {
		selected: string[];
		onchange: (sources: string[]) => void;
	};

	let { selected, onchange }: Props = $props();

	let sources = $state<Open5eSourceInfo[]>([]);
	let loading = $state(true);
	let error = $state<string | null>(null);

	const selectedSet = $derived(new Set(selected));

	// Group sources by game system
	const groupedSources = $derived.by(() => {
		const groups = new Map<string, Open5eSourceInfo[]>();
		for (const src of sources) {
			const list = groups.get(src.gameSystem) ?? [];
			list.push(src);
			groups.set(src.gameSystem, list);
		}
		return groups;
	});

	function selectAll() {
		onchange(sources.map((s) => s.key));
	}

	function selectNone() {
		onchange([]);
	}

	function toggleSource(key: string) {
		const next = new Set(selectedSet);
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		onchange([...next]);
	}

	onMount(async () => {
		try {
			const res = await fetch('/api/open5e/sources');
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			sources = await res.json();
		} catch (err) {
			error = 'Failed to load Open5E sources. Are you signed in?';
			console.error('Failed to fetch Open5E sources:', err);
		} finally {
			loading = false;
		}
	});
</script>

{#if loading}
	<LoadingState variant="list" count={4} />
{:else if error}
	<EmptyState title="Couldn't load sources" description={error} />
{:else if sources.length === 0}
	<EmptyState title="No sources found" description="The Open5E API returned no documents." />
{:else}
	<div class="mb-4 flex items-center gap-2">
		<Button variant="outline" size="sm" onclick={selectAll} disabled={selected.length === sources.length}>
			Select All
		</Button>
		<Button variant="outline" size="sm" onclick={selectNone} disabled={selected.length === 0}>
			Select None
		</Button>
		<span class="ml-auto text-xs text-muted-foreground">
			{selected.length} / {sources.length} selected
		</span>
	</div>
	<div class="space-y-6">
		{#each [...groupedSources.entries()] as [system, systemSources]}
			<div>
				<h3 class="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">{system}</h3>
				<div class="space-y-2">
					{#each systemSources as src}
						<SelectionCard
							selected={selectedSet.has(src.key)}
							onclick={() => toggleSource(src.key)}
						>
							<div class="flex items-center gap-2 pr-6">
								<span class="font-medium">{src.displayName}</span>
								{#if src.spellCount > 0}
									<Badge variant="secondary" class="text-xs">
										{src.spellCount} spells
									</Badge>
								{/if}
							</div>
							<p class="mt-0.5 text-xs text-muted-foreground">
								{src.publisher}
							</p>
						</SelectionCard>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{/if}
