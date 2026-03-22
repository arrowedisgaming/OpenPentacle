<script lang="ts">
	import '../app.css';
	import AppHeader from '$lib/components/layout/AppHeader.svelte';
	import AppFooter from '$lib/components/layout/AppFooter.svelte';
	import { Toaster } from '$lib/components/ui/sonner';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
</svelte:head>

<a href="#main-content" class="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:ring-ring">
	Skip to content
</a>

<div class="flex min-h-screen flex-col bg-background text-foreground">
	<AppHeader />
	<main id="main-content" class="flex-1">
		{@render children()}
	</main>
	<AppFooter />
</div>
<Toaster richColors position="top-right" />
