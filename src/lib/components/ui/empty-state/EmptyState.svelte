<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { Snippet } from 'svelte';

	type Props = {
		icon?: any;
		title: string;
		description?: string;
		actionLabel?: string;
		actionHref?: string;
		onAction?: () => void;
		children?: Snippet;
	};

	let { icon: Icon, title, description, actionLabel, actionHref, onAction, children }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
	{#if Icon}
		<Icon class="mb-3 size-10 text-muted-foreground/50" />
	{/if}
	<h3 class="font-semibold">{title}</h3>
	{#if description}
		<p class="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
	{/if}
	{#if children}
		<div class="mt-4">
			{@render children()}
		</div>
	{:else if actionLabel}
		<div class="mt-4">
			{#if actionHref}
				<Button href={actionHref}>{actionLabel}</Button>
			{:else if onAction}
				<Button onclick={onAction}>{actionLabel}</Button>
			{/if}
		</div>
	{/if}
</div>
