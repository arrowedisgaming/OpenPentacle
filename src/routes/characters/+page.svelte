<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { SYSTEM_NAMES, type SystemId } from '$lib/types/content-pack.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import LoadingState from '$lib/components/ui/loading-state/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/empty-state/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Plus, Trash2, Users, LogIn, Sparkles } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	interface CharacterSummary {
		id: string;
		name: string;
		systemId: string;
		classSummary: string;
		level: number;
		updatedAt: string;
	}

	let characters = $state<CharacterSummary[]>([]);
	let loading = $state(true);
	let deleteTarget = $state<string | null>(null);

	const session = $derived($page.data.session);
	const hasPendingCharacter = $derived($page.url.searchParams.get('saved') === 'local');

	async function loadCharacters() {
		try {
			const res = await fetch('/api/characters');
			if (res.ok) {
				characters = await res.json();
			}
		} finally {
			loading = false;
		}
	}

	async function recoverUnsavedCharacter() {
		const raw = localStorage.getItem('unsaved-character');
		if (!raw) return;

		try {
			const characterData = JSON.parse(raw);
			const res = await fetch('/api/characters', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: raw
			});
			if (res.ok) {
				const { id } = await res.json();
				localStorage.removeItem('unsaved-character');
				const name = characterData.name || 'Your character';
				toast.success(`"${name}" saved!`, {
					action: { label: 'View', onClick: () => goto(`/sheet/${id}`) }
				});
				await loadCharacters();
			} else {
				toast.error('Failed to save your character — please try again');
			}
		} catch {
			toast.error('Failed to save your character — please try again');
		}

		// Clean up the query param
		if (hasPendingCharacter) {
			const url = new URL($page.url);
			url.searchParams.delete('saved');
			history.replaceState({}, '', url.pathname);
		}
	}

	$effect(() => {
		if (session?.user) {
			loadCharacters().then(() => recoverUnsavedCharacter());
		} else {
			loading = false;
		}
	});

	async function deleteCharacter(id: string) {
		const res = await fetch(`/api/characters/${id}`, { method: 'DELETE' });
		if (res.ok) {
			characters = characters.filter((c) => c.id !== id);
		}
		deleteTarget = null;
	}
</script>

<svelte:head>
	<title>My Characters - OpenPentacle</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8">
	<PageHeader as="h1" title="My Characters">
		<Button href="/create" class="gap-2">
			<Plus class="size-4" />
			New Character
		</Button>
	</PageHeader>

	{#if !session?.user}
		<div class="mt-8">
			{#if hasPendingCharacter}
				<EmptyState
					icon={Sparkles}
					title="Almost there!"
					description="Your character is ready to save. Sign in to keep it forever."
					actionLabel="Sign In"
					actionHref="/login"
				/>
			{:else}
				<EmptyState
					icon={LogIn}
					title="Sign in to get started"
					description="Sign in to save and manage your characters."
					actionLabel="Sign In"
					actionHref="/login"
				/>
			{/if}
		</div>
	{:else if loading}
		<div class="mt-8">
			<LoadingState variant="list" count={3} />
		</div>
	{:else if characters.length === 0}
		<div class="mt-8">
			<EmptyState
				icon={Users}
				title="No characters yet"
				description="You haven't created any characters yet."
				actionLabel="Create Your First Character"
				actionHref="/create"
			/>
		</div>
	{:else}
		<div class="mt-6 space-y-3">
			{#each characters as char}
				<Card.Root class="transition-colors hover:bg-accent/30">
					<Card.Content class="flex items-center justify-between py-4">
						<a href="/sheet/{char.id}" class="flex-1">
							<h3 class="font-semibold">{char.name}</h3>
							<p class="text-sm text-muted-foreground">
								Level {char.level} {char.classSummary} &middot;
								{SYSTEM_NAMES[char.systemId as SystemId] ?? char.systemId}
							</p>
						</a>
						<Button
							variant="ghost"
							size="icon-sm"
							onclick={() => deleteTarget = char.id}
							class="text-muted-foreground hover:text-destructive"
						>
							<Trash2 class="size-4" />
						</Button>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<!-- Delete confirmation dialog -->
<Dialog.Root open={!!deleteTarget} onOpenChange={(open) => { if (!open) deleteTarget = null; }}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Delete Character</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to delete this character? This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<div class="flex justify-end gap-2">
			<Button variant="outline" onclick={() => deleteTarget = null}>Cancel</Button>
			<Button variant="destructive" onclick={() => deleteTarget && deleteCharacter(deleteTarget)}>
				Delete
			</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
