<script lang="ts">
	import { SYSTEM_NAMES, type SystemId } from '$lib/types/content-pack.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import LoadingState from '$lib/components/ui/loading-state/LoadingState.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Package } from 'lucide-svelte';

	interface PackSummary {
		id: string;
		name: string;
		version: string;
		system: SystemId;
		description: string;
		license: string;
	}

	let packs = $state<PackSummary[]>([]);
	let loading = $state(true);

	async function loadPacks() {
		try {
			const res = await fetch('/api/content-packs');
			if (res.ok) {
				packs = await res.json();
			}
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		loadPacks();
	});
</script>

<svelte:head>
	<title>Content Packs - OpenPentacle</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
	<PageHeader
		as="h1"
		title="Content Packs"
		description="Game system data is loaded from content packs. All built-in packs use open licenses."
	/>

	{#if loading}
		<div class="mt-8">
			<LoadingState variant="card" count={2} />
		</div>
	{:else}
		<div class="mt-6 space-y-4">
			{#each packs as pack}
				<Card.Root>
					<Card.Header>
						<div class="flex items-start justify-between">
							<Card.Title>{pack.name}</Card.Title>
							<span class="text-sm text-muted-foreground">v{pack.version}</span>
						</div>
						<Card.Description>{pack.description}</Card.Description>
					</Card.Header>
					<Card.Content>
						<div class="flex gap-2">
							<Badge variant="secondary">
								{SYSTEM_NAMES[pack.system] ?? pack.system}
							</Badge>
							<Badge variant="outline">{pack.license}</Badge>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>

		<Card.Root class="mt-8 border-dashed">
			<Card.Header class="text-center">
				<Package class="mx-auto mb-2 size-8 text-muted-foreground/50" />
				<Card.Title class="text-base">Homebrew Content Packs</Card.Title>
				<Card.Description>
					Upload your own content packs to add homebrew classes, species, spells, and more.
					Coming soon in Phase 3.
				</Card.Description>
			</Card.Header>
		</Card.Root>
	{/if}
</div>
