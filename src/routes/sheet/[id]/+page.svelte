<script lang="ts">
	import { page } from '$app/stores';
	import { computeSheet } from '$lib/engine/character-sheet.js';
	import type { ContentPack } from '$lib/types/content-pack.js';
	import type { CharacterData } from '$lib/types/character.js';
	import CharacterSheetView from '$lib/components/sheet/CharacterSheetView.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Share2, Copy, EyeOff, Loader2, ArrowUp } from 'lucide-svelte';

	const { character, pack } = $derived($page.data as {
		character: { id: string; data: CharacterData; shareId: string | null; isPublic: boolean };
		pack: ContentPack;
	});

	const sheet = $derived(pack && character?.data ? computeSheet(character.data, pack) : null);

	let shareUrl = $state('');
	let sharing = $state(false);

	async function toggleShare() {
		sharing = true;
		if (character.isPublic && character.shareId) {
			await fetch(`/api/characters/${character.id}/share`, { method: 'DELETE' });
			character.isPublic = false;
			character.shareId = null;
			shareUrl = '';
		} else {
			const res = await fetch(`/api/characters/${character.id}/share`, { method: 'POST' });
			if (res.ok) {
				const data = await res.json();
				character.shareId = data.shareId;
				character.isPublic = true;
				shareUrl = `${window.location.origin}/share/${data.shareId}`;
			}
		}
		sharing = false;
	}

	function copyShareUrl() {
		if (shareUrl) navigator.clipboard.writeText(shareUrl);
	}
</script>

<svelte:head>
	<title>{sheet?.name ?? 'Character Sheet'} - OpenPentacle</title>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-6 animate-fade-in">
	<!-- Actions bar -->
	<div class="mb-6 flex items-center justify-end gap-2">
		{#if character.data.level < 20}
			<Button
				variant="default"
				size="sm"
				href="/sheet/{character.id}/level-up"
				class="gap-2"
			>
				<ArrowUp class="size-4" />
				Level Up
			</Button>
		{/if}
		<Button
			variant="outline"
			size="sm"
			onclick={toggleShare}
			disabled={sharing}
			class="gap-2"
		>
			{#if sharing}
				<Loader2 class="size-4 animate-spin" />
			{:else if character.isPublic}
				<EyeOff class="size-4" />
				Unshare
			{:else}
				<Share2 class="size-4" />
				Share
			{/if}
		</Button>
		{#if shareUrl}
			<Button variant="outline" size="sm" onclick={copyShareUrl} class="gap-2">
				<Copy class="size-4" />
				Copy Link
			</Button>
		{/if}
	</div>

	{#if sheet}
		<CharacterSheetView {sheet} data={character.data} {pack} />
	{:else}
		<p class="text-muted-foreground">Loading character sheet...</p>
	{/if}
</div>
