<script lang="ts">
	import { page } from '$app/stores';
	import { SYSTEM_NAMES, type SystemId } from '$lib/types/content-pack.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import LoadingState from '$lib/components/ui/loading-state/LoadingState.svelte';
	import EmptyState from '$lib/components/ui/empty-state/EmptyState.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Plus, Trash2, Users, LogIn } from 'lucide-svelte';

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

	$effect(() => {
		if (session?.user) {
			loadCharacters();
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
			<EmptyState
				icon={LogIn}
				title="Sign in to get started"
				description="Sign in to save and manage your characters."
				actionLabel="Sign In"
				actionHref="/login"
			/>
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
