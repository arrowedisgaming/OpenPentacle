<script lang="ts">
	import { SYSTEM_NAMES, type SystemId } from '$lib/types/content-pack.js';
	import { wizardStore } from '$lib/stores/wizard.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Swords, Sparkles, BookOpen, ArrowRight } from 'lucide-svelte';

	// Check for in-progress wizard state (subscribe reactively via $wizardStore)
	const wizardState = $derived($wizardStore);
	const inProgress = $derived.by(() => {
		const char = wizardState.character;
		if (!char) return null;
		const state = { systemId: char.systemId, name: char.name, classId: char.classes?.[0]?.classId };
		if (!state.systemId) return null;
		return state;
	});

	const systems: { id: SystemId; name: string; description: string; available: boolean; icon: typeof Swords }[] = [
		{
			id: 'srd521',
			name: SYSTEM_NAMES['srd521'],
			description: '12 classes, standard species, point buy or rolling. The classic 5th edition rules under Creative Commons.',
			available: true,
			icon: Swords,
		},
		{
			id: 'black-flag',
			name: SYSTEM_NAMES['black-flag'],
			description: 'Lineage + Heritage origins, Talents instead of feats, Luck pool, 32-point buy. Kobold Press.',
			available: false,
			icon: Sparkles,
		},
		{
			id: 'a5e',
			name: SYSTEM_NAMES['a5e'],
			description: 'Heritage + Culture origins, Destiny system, Exertion pool, 13 classes. EN Publishing.',
			available: false,
			icon: BookOpen,
		}
	];
</script>

<svelte:head>
	<title>Choose System - OpenPentacle</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8">
	<PageHeader
		as="h1"
		title="Choose Your Rule System"
		description="Select which 5E-compatible system you want to create a character for."
	/>

	{#if inProgress}
		<Alert.Root class="mt-6">
			<Alert.Description>
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<span class="font-medium">You have a character in progress</span>
						{#if inProgress.name}
							<span class="text-muted-foreground"> — {inProgress.name}</span>
						{/if}
						<span class="text-muted-foreground"> ({SYSTEM_NAMES[inProgress.systemId]})</span>
					</div>
					<div class="flex gap-2">
						<Button size="sm" href="/create/{inProgress.systemId}/class">
							Continue
							<ArrowRight class="size-3" />
						</Button>
						<Button size="sm" variant="outline" onclick={() => wizardStore.reset()}>
							Start Over
						</Button>
					</div>
				</div>
			</Alert.Description>
		</Alert.Root>
	{/if}

	<div class="mt-8 space-y-4">
		{#each systems as system}
			{@const Icon = system.icon}
			{#if system.available}
				<a
					href="/create/{system.id}/class"
					class="block transition-all hover:-translate-y-0.5"
				>
					<Card.Root class="transition-colors hover:border-primary hover:bg-accent/50">
						<Card.Header>
							<div class="flex items-center gap-3">
								<Icon class="size-5 text-primary" />
								<Card.Title>{system.name}</Card.Title>
							</div>
						</Card.Header>
						<Card.Content>
							<p class="text-sm text-muted-foreground">{system.description}</p>
						</Card.Content>
					</Card.Root>
				</a>
			{:else}
				<Card.Root class="opacity-50">
					<Card.Header>
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<Icon class="size-5" />
								<Card.Title>{system.name}</Card.Title>
							</div>
							<Badge variant="outline">Coming soon</Badge>
						</div>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground">{system.description}</p>
					</Card.Content>
				</Card.Root>
			{/if}
		{/each}
	</div>
</div>
