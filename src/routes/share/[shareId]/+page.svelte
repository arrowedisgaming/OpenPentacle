<script lang="ts">
	import { page } from '$app/stores';
	import { computeSheet } from '$lib/engine/character-sheet.js';
	import type { ContentPack } from '$lib/types/content-pack.js';
	import type { CharacterData } from '$lib/types/character.js';
	import CharacterSheetView from '$lib/components/sheet/CharacterSheetView.svelte';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';

	const { character, pack } = $derived($page.data as {
		character: { name: string; data: CharacterData; classSummary: string; level: number };
		pack: ContentPack;
	});

	const sheet = $derived(pack && character?.data ? computeSheet(character.data, pack) : null);
</script>

<svelte:head>
	<title>{character?.name ?? 'Shared Character'} - OpenPentacle</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
	<!-- Public banner -->
	<Alert.Root class="mb-6">
		<Alert.Description class="flex items-center justify-center gap-2">
			This is a shared character sheet.
			<Button variant="link" href="/create" class="h-auto p-0">Create your own character</Button>
		</Alert.Description>
	</Alert.Root>

	{#if sheet}
		<CharacterSheetView {sheet} data={character.data} {pack} />
	{:else}
		<p class="text-muted-foreground">Loading shared character...</p>
	{/if}
</div>
