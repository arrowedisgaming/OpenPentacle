<script lang="ts">
	import { page } from '$app/stores';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import SourceSelector from '$lib/components/open5e/SourceSelector.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { BookOpen, Save, Check } from 'lucide-svelte';

	const pageData = $derived($page.data as { enabledSources: string[] });

	let selectedSources = $state<string[]>([]);
	let initialized = $state(false);

	// Sync from server data on first load
	$effect(() => {
		if (!initialized && pageData.enabledSources) {
			selectedSources = [...pageData.enabledSources];
			initialized = true;
		}
	});
	let saving = $state(false);
	let saved = $state(false);

	const hasChanges = $derived(
		JSON.stringify([...selectedSources].sort()) !== JSON.stringify([...(pageData.enabledSources ?? [])].sort())
	);

	function handleSourcesChange(sources: string[]) {
		selectedSources = sources;
		saved = false;
	}

	async function saveDefaults() {
		saving = true;
		try {
			const res = await fetch('/api/settings/open5e-defaults', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enabledSources: selectedSources })
			});
			if (res.ok) {
				saved = true;
			}
		} catch (err) {
			console.error('Failed to save defaults:', err);
		} finally {
			saving = false;
		}
	}
</script>

<svelte:head>
	<title>Settings - OpenPentacle</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
	<PageHeader
		as="h1"
		title="Settings"
		description="Manage your account preferences and content sources."
	/>

	<Card.Root class="mt-6">
		<Card.Header>
			<div class="flex items-center gap-2">
				<BookOpen class="size-5" />
				<Card.Title>Open5E Spell Sources</Card.Title>
			</div>
			<Card.Description>
				Select default spell sources for new characters. These sources add third-party spells
				from the <a href="https://open5e.com" target="_blank" rel="noopener" class="underline hover:text-foreground">Open5E</a> library.
				You can also change sources per-character in the spell selection step.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if selectedSources.length > 0}
				<div class="mb-4 flex items-center gap-2">
					<Badge variant="secondary">
						{selectedSources.length} source{selectedSources.length !== 1 ? 's' : ''} enabled
					</Badge>
				</div>
			{/if}
			<SourceSelector
				selected={selectedSources}
				onchange={handleSourcesChange}
			/>
		</Card.Content>
		<Card.Footer class="flex items-center gap-3">
			<Button onclick={saveDefaults} disabled={saving || !hasChanges}>
				{#if saving}
					<span class="mr-1.5 size-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
					Saving...
				{:else if saved}
					<Check class="mr-1.5 size-3.5" />
					Saved
				{:else}
					<Save class="mr-1.5 size-3.5" />
					Save as Defaults
				{/if}
			</Button>
			{#if hasChanges}
				<span class="text-xs text-muted-foreground">Unsaved changes</span>
			{/if}
		</Card.Footer>
	</Card.Root>

	<Alert.Root class="mt-4">
		<Alert.Description>
			Default sources are applied when you start creating a new character. Existing characters keep their own source selections.
		</Alert.Description>
	</Alert.Root>
</div>
