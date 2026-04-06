<script lang="ts">
	import { page } from '$app/stores';
	import { onMount } from 'svelte';
	import { computeSheet } from '$lib/engine/character-sheet.js';
	import { applyShortRest, applyLongRest } from '$lib/engine/rest.js';
	import type { ContentPack, SpellDefinition } from '$lib/types/content-pack.js';
	import type { CharacterData } from '$lib/types/character.js';
	import CharacterSheetView from '$lib/components/sheet/CharacterSheetView.svelte';
	import ResourceTracker from '$lib/components/sheet/ResourceTracker.svelte';
	import RestDialog from '$lib/components/sheet/RestDialog.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Share2, Copy, EyeOff, Loader2, ArrowUp, Pencil, Download } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	const pageData = $derived($page.data as {
		character: { id: string; data: CharacterData; shareId: string | null; isPublic: boolean };
		pack: ContentPack;
	});
	const pack = $derived(pageData.pack);

	// Mutable local copy of character — server data seeds it, local mutations drive reactivity
	let character = $state(pageData.character);
	// Re-sync if the page navigates to a different character
	$effect(() => { character = pageData.character; });

	const charData = $derived(character.data);
	const sheet = $derived(pack && charData ? computeSheet(charData, pack) : null);

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

	let generatingPDF = $state(false);
	async function handleDownloadPDF() {
		if (!sheet || generatingPDF) return;
		generatingPDF = true;
		try {
			const { downloadCharacterPDF } = await import('$lib/pdf/pdf-generator.js');
			await downloadCharacterPDF(character.data, pack, sheet, open5eSpells);
		} catch (err) {
			console.error('PDF generation failed:', err);
			toast.error('Failed to generate PDF');
		} finally {
			generatingPDF = false;
		}
	}

	// ─── Resource Tracking ──────────────────────────────────────

	let saving = $state(false);

	async function saveCharacterData(data: CharacterData) {
		saving = true;
		try {
			const res = await fetch(`/api/characters/${character.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(data)
			});
			if (!res.ok) {
				toast.error('Failed to save changes');
			}
		} catch {
			toast.error('Failed to save changes');
		} finally {
			saving = false;
		}
	}

	function updateCharacterData(updater: (data: CharacterData) => CharacterData) {
		character.data = updater(character.data);
		saveCharacterData(character.data);
	}

	function handleHPChange(current: number, temporary: number) {
		updateCharacterData((d) => ({
			...d,
			hitPoints: { ...d.hitPoints, current, temporary }
		}));
	}

	function handleHitDiceChange(dieIndex: number, used: number) {
		updateCharacterData((d) => ({
			...d,
			hitPoints: {
				...d.hitPoints,
				hitDice: d.hitPoints.hitDice.map((hd, i) =>
					i === dieIndex ? { ...hd, used } : hd
				)
			}
		}));
	}

	function handleResourceChange(key: string, used: number) {
		updateCharacterData((d) => {
			const resourceUsage = { ...d.resourceUsage, [key]: used };
			// Clean up zero entries
			if (used === 0) delete resourceUsage[key];
			return {
				...d,
				resourceUsage: Object.keys(resourceUsage).length > 0 ? resourceUsage : undefined
			};
		});
	}

	function handleSpellSlotChange(level: number, used: number) {
		updateCharacterData((d) => {
			const spellSlotsUsed = { ...d.spells.spellSlotsUsed, [String(level)]: used };
			if (used === 0) delete spellSlotsUsed[String(level)];
			return {
				...d,
				spells: {
					...d.spells,
					spellSlotsUsed: Object.keys(spellSlotsUsed).length > 0 ? spellSlotsUsed : undefined
				}
			};
		});
	}

	function handlePactSlotChange(used: number) {
		updateCharacterData((d) => ({
			...d,
			spells: { ...d.spells, pactSlotsUsed: used > 0 ? used : undefined }
		}));
	}

	// Rest dialogs
	let restDialogType = $state<'short' | 'long'>('short');
	let restDialogOpen = $state(false);

	function openRestDialog(type: 'short' | 'long') {
		restDialogType = type;
		restDialogOpen = true;
	}

	async function handleRestConfirm() {
		if (restDialogType === 'short') {
			character.data = applyShortRest(character.data, pack);
		} else {
			character.data = applyLongRest(character.data, pack);
		}
		await saveCharacterData(character.data);
		toast.success(restDialogType === 'short' ? 'Short rest complete' : 'Long rest complete — fully restored!');
	}

	// Show resource tracker if character has any trackable resources or spell slots
	const hasResources = $derived(
		sheet && (
			sheet.resources.length > 0 ||
			sheet.spellSlotResources.slots.length > 0 ||
			sheet.spellSlotResources.pactSlots !== null ||
			character.data.hitPoints.hitDice.length > 0
		)
	);
</script>

<svelte:head>
	<title>{sheet?.name ?? 'Character Sheet'} - OpenPentacle</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
	<!-- Actions bar -->
	<div class="mb-6 flex items-center justify-end gap-2">
		<Button
			variant="outline"
			size="sm"
			onclick={handleDownloadPDF}
			disabled={generatingPDF}
			class="gap-2"
		>
			{#if generatingPDF}
				<Loader2 class="size-4 animate-spin" />
				Generating...
			{:else}
				<Download class="size-4" />
				PDF
			{/if}
		</Button>
		<Button
			variant="outline"
			size="sm"
			href="/sheet/{character.id}/edit"
			class="gap-2"
		>
			<Pencil class="size-4" />
			Edit
		</Button>
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

		{#if hasResources}
			<div class="mt-6">
				<ResourceTracker
					hitPoints={character.data.hitPoints}
					resources={sheet.resources}
					spellSlotResources={sheet.spellSlotResources}
					onHPChange={handleHPChange}
					onHitDiceChange={handleHitDiceChange}
					onResourceChange={handleResourceChange}
					onSpellSlotChange={handleSpellSlotChange}
					onPactSlotChange={handlePactSlotChange}
					onShortRest={() => openRestDialog('short')}
					onLongRest={() => openRestDialog('long')}
				/>
			</div>
		{/if}
	{:else}
		<p class="text-muted-foreground">Loading character sheet...</p>
	{/if}
</div>

<RestDialog
	type={restDialogType}
	open={restDialogOpen}
	onOpenChange={(v) => restDialogOpen = v}
	onConfirm={handleRestConfirm}
/>
