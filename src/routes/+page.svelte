<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Swords, Sparkles, BookOpen } from 'lucide-svelte';

	const session = $derived($page.data.session);

	const systems = [
		{
			name: 'D&D 5e SRD 5.2.1',
			description: 'The classic. 12 classes, standard species, and the full SRD spell list.',
			badge: 'Available',
			available: true,
			icon: Swords,
		},
		{
			name: 'Black Flag Roleplaying',
			description: "Kobold Press's take: Lineage + Heritage, Talents, Luck, and 32-point buy.",
			badge: 'Coming Soon',
			available: false,
			icon: Sparkles,
		},
		{
			name: 'Advanced 5th Edition',
			description: 'Level Up A5E: Heritage + Culture, Destiny, Exertion pool, 13 classes.',
			badge: 'Coming Soon',
			available: false,
			icon: BookOpen,
		},
	];
</script>

<svelte:head>
	<title>OpenPentacle — 5E Character Creator</title>
</svelte:head>

<div class="flex flex-1 flex-col">
	<!-- Hero -->
	<section class="flex flex-1 flex-col items-center justify-center px-4 py-16">
		<div class="mx-auto max-w-2xl text-center animate-fade-in">
			<h1 class="text-4xl font-bold tracking-tight sm:text-5xl">
				Create Characters for Any
				<span class="text-primary">5E-Compatible</span> System
			</h1>
			<p class="mt-4 text-lg text-muted-foreground">
				Open-source character creator supporting D&D 5e SRD, Black Flag Roleplaying,
				Advanced 5th Edition, and homebrew content packs. Free forever.
			</p>

			<div class="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
				<Button size="lg" href="/create">Create a Character</Button>
				{#if !session?.user}
					<Button variant="outline" size="lg" href="/login">Sign In to Save</Button>
				{/if}
			</div>
		</div>

		<!-- System Cards -->
		<div class="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-6 sm:grid-cols-3">
			{#each systems as system}
				{@const Icon = system.icon}
				<Card.Root class="transition-all {system.available ? 'hover:-translate-y-1 hover:shadow-md' : 'opacity-60'}">
					<Card.Header>
						<div class="flex items-center gap-2">
							<Icon class="size-5 text-primary" />
							<Card.Title class="text-base">{system.name}</Card.Title>
						</div>
					</Card.Header>
					<Card.Content>
						<p class="text-sm text-muted-foreground">{system.description}</p>
						<Badge variant={system.available ? 'secondary' : 'outline'} class="mt-3">
							{system.badge}
						</Badge>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	</section>
</div>
