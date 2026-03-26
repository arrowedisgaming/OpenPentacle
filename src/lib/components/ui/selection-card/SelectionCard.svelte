<script lang="ts">
	import { cn } from '$lib/utils';
	import { Check } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	type Props = {
		selected?: boolean;
		disabled?: boolean;
		compact?: boolean;
		onclick?: () => void;
		children: Snippet;
		footer?: Snippet;
		class?: string;
	};

	let {
		selected = false,
		disabled = false,
		compact = false,
		onclick,
		children,
		footer,
		class: className,
	}: Props = $props();
</script>

<button
	type="button"
	role="option"
	aria-selected={selected}
	{disabled}
	{onclick}
	tabindex={selected ? 0 : -1}
	class={cn(
		'relative w-full rounded-lg border text-left transition-all',
		compact ? 'p-3' : 'p-4 sm:p-5',
		selected
			? 'border-primary bg-accent shadow-sm ring-1 ring-primary/20'
			: 'border-border hover:border-primary/50 hover:bg-accent/30 hover:shadow-sm',
		disabled && 'pointer-events-none opacity-50',
		className
	)}
>
	{#if selected}
		<div class="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
			<Check class="size-3" />
		</div>
	{/if}
	{@render children()}
	{#if footer}
		<div class="mt-2 border-t border-border/50 pt-2">
			{@render footer()}
		</div>
	{/if}
</button>
