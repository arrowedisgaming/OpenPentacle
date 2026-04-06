<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Moon, Sun } from 'lucide-svelte';

	type Props = {
		type: 'short' | 'long';
		open: boolean;
		onOpenChange: (open: boolean) => void;
		onConfirm: () => void;
	};

	let { type, open, onOpenChange, onConfirm }: Props = $props();

	function handleConfirm() {
		onConfirm();
		onOpenChange(false);
	}
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				{#if type === 'short'}
					<Moon class="size-5" />
					Short Rest
				{:else}
					<Sun class="size-5" />
					Long Rest
				{/if}
			</Dialog.Title>
		</Dialog.Header>

		<div class="py-4 space-y-2 text-sm">
			{#if type === 'short'}
				<p>Take a short rest (at least 1 hour). This will:</p>
				<ul class="list-disc pl-5 space-y-1 text-muted-foreground">
					<li>Restore short-rest class resources (e.g., Focus Points)</li>
					<li>Restore Pact Magic slots</li>
				</ul>
				<p class="text-xs text-muted-foreground mt-2">
					You can spend hit dice manually before or after resting.
				</p>
			{:else}
				<p>Take a long rest (at least 8 hours). This will:</p>
				<ul class="list-disc pl-5 space-y-1 text-muted-foreground">
					<li>Restore all hit points</li>
					<li>Clear temporary hit points</li>
					<li>Recover half your total hit dice (minimum 1)</li>
					<li>Restore all spell slots</li>
					<li>Restore all class resources (Rages, Focus Points, Sorcery Points, etc.)</li>
				</ul>
			{/if}
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => onOpenChange(false)}>Cancel</Button>
			<Button onclick={handleConfirm}>
				{type === 'short' ? 'Take Short Rest' : 'Take Long Rest'}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
