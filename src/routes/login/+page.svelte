<script lang="ts">
	import { dev } from '$app/environment';
	import { signIn } from '@auth/sveltekit/client';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Swords } from 'lucide-svelte';

	let devEmail = $state('dev@example.com');
	let devName = $state('Dev User');
</script>

<svelte:head>
	<title>Sign In - OpenPentacle</title>
</svelte:head>

<div class="flex min-h-[80vh] items-center justify-center px-4">
	<Card.Root class="w-full max-w-sm animate-fade-in">
		<Card.Header class="text-center">
			<div class="mx-auto mb-2 flex items-center gap-2 text-2xl font-bold tracking-tight">
				<Swords class="size-6 text-primary" />
				OpenPentacle
			</div>
			<Card.Description>
				Sign in to save characters and access them from any device.
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-3">
			<Button
				variant="outline"
				class="w-full justify-center gap-3"
				size="lg"
				onclick={() => signIn('google', { callbackUrl: '/characters' })}
			>
				<svg class="size-5" viewBox="0 0 24 24">
					<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
					<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
					<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
					<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
				</svg>
				Continue with Google
			</Button>

			<div class="flex items-center gap-3">
				<Separator class="flex-1" />
				<span class="text-xs text-muted-foreground">or</span>
				<Separator class="flex-1" />
			</div>

			<Button
				variant="outline"
				class="w-full justify-center gap-3"
				size="lg"
				onclick={() => signIn('discord', { callbackUrl: '/characters' })}
			>
				<svg class="size-5" viewBox="0 0 24 24" fill="#5865F2">
					<path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
				</svg>
				Continue with Discord
			</Button>

			{#if dev}
				<div class="flex items-center gap-3">
					<Separator class="flex-1" />
					<span class="text-xs text-muted-foreground">dev only</span>
					<Separator class="flex-1" />
				</div>

				<div class="space-y-3 rounded-lg border-2 border-dashed border-orange-400/50 bg-orange-50/50 p-3 dark:bg-orange-950/20">
					<p class="text-center text-xs font-medium text-orange-600 dark:text-orange-400">
						Dev Credentials (not available in production)
					</p>
					<div class="space-y-1.5">
						<Label for="dev-email" class="text-xs">Email</Label>
						<Input id="dev-email" type="email" bind:value={devEmail} />
					</div>
					<div class="space-y-1.5">
						<Label for="dev-name" class="text-xs">Name</Label>
						<Input id="dev-name" type="text" bind:value={devName} />
					</div>
					<Button
						class="w-full bg-orange-500 text-white hover:bg-orange-600"
						size="lg"
						onclick={() => signIn('credentials', { email: devEmail, name: devName, callbackUrl: '/characters' })}
					>
						Dev Sign In
					</Button>
				</div>
			{/if}
		</Card.Content>
		<Card.Footer class="justify-center">
			<p class="text-xs text-muted-foreground">
				You can also <a href="/create" class="underline hover:text-foreground">create characters without signing in</a>.
			</p>
		</Card.Footer>
	</Card.Root>
</div>
