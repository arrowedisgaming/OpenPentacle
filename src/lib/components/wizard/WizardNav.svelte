<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-svelte';

	type Props = {
		backHref?: string;
		backLabel?: string;
		nextLabel?: string;
		onNext?: () => void;
		nextDisabled?: boolean;
		saving?: boolean;
		compact?: boolean;
	};

	let {
		backHref,
		backLabel = 'Back',
		nextLabel = 'Next',
		onNext,
		nextDisabled = false,
		saving = false,
		compact = false,
	}: Props = $props();
</script>

<div class="{compact ? 'mb-4 flex items-center justify-between' : 'sticky bottom-0 z-10 mt-8 flex items-center justify-between border-t border-border bg-background pt-4 pb-4'}">
	{#if backHref}
		<Button variant="outline" href={backHref} size={compact ? 'sm' : 'default'}>
			<ChevronLeft class="size-4" />
			{#if !compact}{backLabel}{/if}
		</Button>
	{:else}
		<div></div>
	{/if}
	{#if onNext}
		<Button onclick={onNext} disabled={nextDisabled || saving} size={compact ? 'sm' : 'default'}>
			{#if saving}
				<Loader2 class="size-4 animate-spin" />
				Saving...
			{:else}
				{nextLabel}
				<ChevronRight class="size-4" />
			{/if}
		</Button>
	{/if}
</div>
