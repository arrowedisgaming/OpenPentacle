<script lang="ts">
	import { cn } from '$lib/utils';

	type Props = {
		label: string;
		value: string | number;
		subValue?: string;
		size?: 'sm' | 'md' | 'lg';
		icon?: any;
		class?: string;
	};

	let {
		label,
		value,
		subValue,
		size = 'md',
		icon: Icon,
		class: className,
	}: Props = $props();
</script>

<div
	class={cn(
		'flex flex-col items-center rounded-lg border border-border p-3 text-center',
		size === 'sm' && 'p-2',
		size === 'lg' && 'p-4',
		className
	)}
>
	{#if Icon}
		<Icon class={cn('mb-1 text-muted-foreground', size === 'sm' ? 'size-3' : 'size-4')} />
	{/if}
	<div class={cn('text-xs font-medium text-muted-foreground', size === 'lg' && 'text-sm')}>
		{label}
	</div>
	<div class={cn(
		'font-bold',
		size === 'sm' && 'text-lg',
		size === 'md' && 'text-xl',
		size === 'lg' && 'text-2xl'
	)}>
		{value}
	</div>
	{#if subValue}
		<div class="text-sm text-muted-foreground">{subValue}</div>
	{/if}
</div>
