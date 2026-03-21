<script lang="ts">
	import { Swords, Users, Package, LogIn, LogOut } from 'lucide-svelte';
	import ThemeToggle from './ThemeToggle.svelte';
	import { Button } from '$lib/components/ui/button';
	import * as SheetUI from '$lib/components/ui/sheet';
	import { Separator } from '$lib/components/ui/separator';
	import { signOut } from '@auth/sveltekit/client';

	type Props = {
		session: { user?: { name?: string | null; image?: string | null } } | null;
		open: boolean;
	};

	let { session, open = $bindable(false) }: Props = $props();

	const navLinks = [
		{ href: '/create', label: 'Create Character', icon: Swords },
		{ href: '/characters', label: 'My Characters', icon: Users },
		{ href: '/content-packs', label: 'Content Packs', icon: Package },
	];
</script>

<SheetUI.Content side="left" class="w-72">
	<SheetUI.Header>
		<SheetUI.Title class="flex items-center gap-2">
			<Swords class="size-5 text-primary" />
			OpenPentacle
		</SheetUI.Title>
	</SheetUI.Header>
	<nav class="mt-4 flex flex-col gap-1">
		{#each navLinks as link}
			{@const Icon = link.icon}
			<a
				href={link.href}
				class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
				onclick={() => open = false}
			>
				<Icon class="size-4 text-muted-foreground" />
				{link.label}
			</a>
		{/each}
	</nav>
	<Separator class="my-4" />
	<div class="flex items-center justify-between px-3">
		<span class="text-sm text-muted-foreground">Theme</span>
		<ThemeToggle />
	</div>
	<Separator class="my-4" />
	{#if session?.user}
		<div class="px-3">
			<p class="text-sm font-medium">{session.user.name}</p>
			<Button
				variant="ghost"
				size="sm"
				class="mt-2 w-full justify-start gap-2"
				onclick={() => signOut()}
			>
				<LogOut class="size-4" />
				Sign Out
			</Button>
		</div>
	{:else}
		<div class="px-3">
			<Button
				variant="outline"
				size="sm"
				href="/login"
				class="w-full justify-start gap-2"
				onclick={() => open = false}
			>
				<LogIn class="size-4" />
				Sign In
			</Button>
		</div>
	{/if}
</SheetUI.Content>
