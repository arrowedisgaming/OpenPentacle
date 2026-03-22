<script lang="ts">
	import { page } from '$app/stores';
	import { signOut } from '@auth/sveltekit/client';
	import { Swords, Menu, LogIn, LogOut, User, Settings } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as SheetUI from '$lib/components/ui/sheet';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import ThemeToggle from './ThemeToggle.svelte';
	import MobileNav from './MobileNav.svelte';

	const session = $derived($page.data.session);
	let mobileNavOpen = $state(false);

	const navLinks = [
		{ href: '/create', label: 'Create' },
		{ href: '/characters', label: 'My Characters' },
		{ href: '/content-packs', label: 'Content Packs' },
	];

	function userInitials(name?: string | null): string {
		if (!name) return '?';
		return name
			.split(' ')
			.map((n) => n[0])
			.join('')
			.toUpperCase()
			.slice(0, 2);
	}
</script>

<header class="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/60">
	<div class="mx-auto flex h-14 max-w-5xl items-center gap-4 px-4">
		<!-- Mobile hamburger -->
		<SheetUI.Root bind:open={mobileNavOpen}>
			<SheetUI.Trigger>
				{#snippet child({ props })}
					<Button variant="ghost" size="icon-sm" class="md:hidden" {...props}>
						<Menu class="size-5" />
						<span class="sr-only">Menu</span>
					</Button>
				{/snippet}
			</SheetUI.Trigger>
			<MobileNav session={session ?? null} bind:open={mobileNavOpen} />
		</SheetUI.Root>

		<!-- Logo -->
		<a href="/" class="flex items-center gap-2 font-bold tracking-tight">
			<Swords class="size-5 text-primary" />
			<span>OpenPentacle</span>
		</a>

		<!-- Desktop nav -->
		<nav class="hidden items-center gap-1 md:flex">
			{#each navLinks as link}
				<a
					href={link.href}
					class="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					class:text-foreground={$page.url.pathname.startsWith(link.href)}
				>
					{link.label}
				</a>
			{/each}
		</nav>

		<!-- Spacer -->
		<div class="flex-1"></div>

		<!-- Theme toggle (desktop) -->
		<div class="hidden md:block">
			<ThemeToggle />
		</div>

		<!-- User menu -->
		{#if session?.user}
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<button
							class="flex items-center gap-2 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
							{...props}
						>
							<Avatar class="size-8">
								{#if session.user?.image}
									<AvatarImage src={session.user.image} alt={session.user.name ?? 'User'} />
								{/if}
								<AvatarFallback class="text-xs">
									{userInitials(session.user?.name)}
								</AvatarFallback>
							</Avatar>
						</button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-48">
					<DropdownMenu.Label>
						{session.user.name ?? 'User'}
					</DropdownMenu.Label>
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={() => { window.location.href = '/characters'; }}>
						<User class="mr-2 size-4" />
						My Characters
					</DropdownMenu.Item>
					<DropdownMenu.Item onclick={() => { window.location.href = '/settings'; }}>
						<Settings class="mr-2 size-4" />
						Settings
					</DropdownMenu.Item>
					<DropdownMenu.Separator />
					<DropdownMenu.Item onclick={() => signOut()}>
						<LogOut class="mr-2 size-4" />
						Sign Out
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		{:else}
			<Button variant="outline" size="sm" href="/login" class="gap-2">
				<LogIn class="size-4" />
				<span class="hidden sm:inline">Sign In</span>
			</Button>
		{/if}
	</div>
</header>
