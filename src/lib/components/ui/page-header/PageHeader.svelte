<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		description?: string;
		/** Render as h1 instead of h2 (use on pages that need a top-level heading) */
		as?: 'h1' | 'h2';
		children?: Snippet;
	};

	let { title, description, as: headingLevel = 'h2', children }: Props = $props();
</script>

<div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
	<div>
		{#if headingLevel === 'h1'}
			<h1 class="text-2xl font-bold sm:text-3xl">{title}</h1>
		{:else}
			<h2 class="text-2xl font-bold sm:text-3xl">{title}</h2>
		{/if}
		{#if description}
			<p class="mt-1 text-base text-muted-foreground">{description}</p>
		{/if}
	</div>
	{#if children}
		<div class="mt-2 sm:mt-0">
			{@render children()}
		</div>
	{/if}
</div>
