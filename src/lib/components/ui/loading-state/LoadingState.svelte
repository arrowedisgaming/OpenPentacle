<script lang="ts">
	import { Skeleton } from '$lib/components/ui/skeleton';

	type Props = {
		variant?: 'card' | 'list' | 'grid';
		count?: number;
	};

	let { variant = 'card', count = 3 }: Props = $props();
</script>

{#if variant === 'grid'}
	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each Array(count) as _}
			<div class="rounded-lg border border-border p-4">
				<Skeleton class="h-5 w-3/4" />
				<Skeleton class="mt-2 h-4 w-full" />
				<Skeleton class="mt-1 h-4 w-2/3" />
			</div>
		{/each}
	</div>
{:else if variant === 'list'}
	<div class="space-y-3">
		{#each Array(count) as _}
			<div class="flex items-center gap-4 rounded-lg border border-border p-4">
				<Skeleton class="size-10 rounded-full" />
				<div class="flex-1">
					<Skeleton class="h-5 w-1/3" />
					<Skeleton class="mt-1 h-4 w-1/2" />
				</div>
			</div>
		{/each}
	</div>
{:else}
	<div class="space-y-4">
		{#each Array(count) as _}
			<div class="rounded-lg border border-border p-6">
				<Skeleton class="h-6 w-1/2" />
				<Skeleton class="mt-3 h-4 w-full" />
				<Skeleton class="mt-2 h-4 w-3/4" />
			</div>
		{/each}
	</div>
{/if}
