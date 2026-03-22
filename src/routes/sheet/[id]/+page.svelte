<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { computeSheet } from '$lib/engine/character-sheet.js';
	import type { ContentPack, SpellDefinition } from '$lib/types/content-pack.js';
	import type { CharacterData } from '$lib/types/character.js';
	import CharacterSheetView from '$lib/components/sheet/CharacterSheetView.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Share2, Copy, EyeOff, Loader2, ArrowUp } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	const { character, pack } = $derived($page.data as {
		character: { id: string; data: CharacterData; shareId: string | null; isPublic: boolean };
		pack: ContentPack;
	});

	const sheet = $derived(pack && character?.data ? computeSheet(character.data, pack) : null);

	let open5eSpells = $state<SpellDefinition[]>([]);
	onMount(async () => {
		const sources = character?.data?.open5eSources;
		if (!sources?.length) return;
		try {
			const res = await fetch(`/api/open5e/spells?sources=${sources.join(',')}`);
			if (res.ok) open5eSpells = await res.json();
		} catch { /* graceful degradation */ }
	});

	// Initialize shareUrl from existing server data so Copy Link persists across refreshes
	let shareUrl = $state('');
	let sharing = $state(false);

	onMount(() => {
		if (character.isPublic && character.shareId) {
			shareUrl = `${window.location.origin}/share/${character.shareId}`;
		}
	});

	async function copyToClipboard(url: string) {
		try {
			await navigator.clipboard.writeText(url);
			return true;
		} catch {
			toast.error('Failed to copy — try copying the link manually');
			return false;
		}
	}

	async function toggleShare() {
		sharing = true;
		try {
			if (character.isPublic) {
				const res = await fetch(`/api/characters/${character.id}/share`, { method: 'DELETE' });
				if (!res.ok) throw new Error();
				character.isPublic = false;
				shareUrl = '';
				toast.success('Character unshared');
			} else {
				const res = await fetch(`/api/characters/${character.id}/share`, { method: 'POST' });
				if (!res.ok) throw new Error();
				const data = await res.json();
				character.shareId = data.shareId;
				character.isPublic = true;
				shareUrl = `${window.location.origin}/share/${data.shareId}`;
				if (await copyToClipboard(shareUrl)) {
					toast.success('Share link copied to clipboard!');
				}
			}
		} catch {
			toast.error('Something went wrong — please try again');
		} finally {
			sharing = false;
		}
	}

	async function copyShareUrl() {
		if (!shareUrl) return;
		if (await copyToClipboard(shareUrl)) {
			toast.success('Link copied!');
		}
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
				{character.isPublic ? 'Unsharing...' : 'Sharing...'}
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
		<CharacterSheetView {sheet} data={character.data} {pack} additionalSpells={open5eSpells} />
	{:else}
		<p class="text-muted-foreground">Loading character sheet...</p>
	{/if}
</div>
