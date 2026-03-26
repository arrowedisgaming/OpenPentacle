<script lang="ts">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Progress } from '$lib/components/ui/progress';
	import * as Dialog from '$lib/components/ui/dialog';
	import { ChevronLeft, Check } from 'lucide-svelte';

	let showLeaveDialog = $state(false);

	interface WizardStep {
		id: string;
		label: string;
		path: string;
		conditional?: boolean;
	}

	let {
		steps,
		currentStepIndex,
		accessibleStepIndexes = [],
		systemId,
		children
	}: {
		steps: WizardStep[];
		currentStepIndex: number;
		accessibleStepIndexes?: number[];
		systemId: string;
		children: Snippet;
	} = $props();

	const progressPercent = $derived(((currentStepIndex + 1) / steps.length) * 100);
</script>

<div class="mx-auto max-w-5xl px-4 py-6">
	<!-- Back nav -->
	<nav class="mb-6">
		<Button variant="ghost" size="sm" onclick={() => showLeaveDialog = true} class="gap-1 text-muted-foreground">
			<ChevronLeft class="size-4" />
			Change system
		</Button>
	</nav>

	<Dialog.Root bind:open={showLeaveDialog}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Leave character creation?</Dialog.Title>
				<Dialog.Description>
					Your progress is saved locally. You can resume this character later from the system selection page.
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => showLeaveDialog = false}>
					Stay
				</Button>
				<Button onclick={() => goto('/create')}>
					Leave
				</Button>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>

	<!-- Step indicator -->
	<div class="mb-8">
		<!-- Mobile stepper: progress bar + step name -->
		<div class="sm:hidden">
			<div class="mb-2 flex items-center justify-between text-sm">
				<span class="text-muted-foreground">
					Step {currentStepIndex + 1} of {steps.length}
				</span>
				<span class="font-medium">{steps[currentStepIndex]?.label}</span>
			</div>
			<Progress value={progressPercent} class="h-1.5" />
		</div>

		<!-- Desktop stepper: circles with connecting lines -->
		<div class="hidden sm:block">
			<div class="flex items-center gap-2">
				{#each steps as step, i}
					{@const isCurrent = i === currentStepIndex}
					{@const isComplete = i < currentStepIndex}
					{@const isAccessible = accessibleStepIndexes.includes(i)}

					{#if i > 0}
						<div
							class="h-px flex-1 transition-colors {isComplete ? 'bg-primary' : 'bg-border'}"
						></div>
					{/if}

					{#if isAccessible}
						<a
							href="/create/{systemId}/{step.path}"
							class="flex items-center gap-1.5 text-sm {isCurrent ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground'}"
						>
							<span
								class="flex h-8 w-8 items-center justify-center rounded-full text-xs transition-colors
								{isComplete ? 'bg-primary text-primary-foreground' : isCurrent ? 'border-2 border-primary text-primary' : 'border border-border text-muted-foreground'}"
							>
								{#if isComplete}
									<Check class="size-4" />
								{:else}
									{i + 1}
								{/if}
							</span>
							<span class="hidden lg:inline">{step.label}</span>
						</a>
					{:else}
						<span class="flex items-center gap-1.5 text-sm text-muted-foreground/50">
							<span class="flex h-8 w-8 items-center justify-center rounded-full border border-border/50 text-xs">
								{i + 1}
							</span>
							<span class="hidden lg:inline">{step.label}</span>
						</span>
					{/if}
				{/each}
			</div>
		</div>
	</div>

	<!-- Step content -->
	<div class="min-h-[50vh] animate-fade-in">
		{@render children()}
	</div>
</div>
