<script lang="ts">
	import type { ComputedResource, SpellSlotResource } from '$lib/engine/resources.js';
	import type { HitPointData } from '$lib/types/character.js';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import { Heart, Moon, Sun, Minus, Plus, Sparkles } from 'lucide-svelte';

	type Props = {
		hitPoints: HitPointData;
		resources: ComputedResource[];
		spellSlotResources: { slots: SpellSlotResource[]; pactSlots: SpellSlotResource | null };
		onHPChange: (current: number, temporary: number) => void;
		onHitDiceChange: (dieIndex: number, used: number) => void;
		onResourceChange: (key: string, used: number) => void;
		onSpellSlotChange: (level: number, used: number) => void;
		onPactSlotChange: (used: number) => void;
		onShortRest: () => void;
		onLongRest: () => void;
	};

	let {
		hitPoints,
		resources,
		spellSlotResources,
		onHPChange,
		onHitDiceChange,
		onResourceChange,
		onSpellSlotChange,
		onPactSlotChange,
		onShortRest,
		onLongRest
	}: Props = $props();

	let hpDelta = $state('');
	let tempHPDelta = $state('');

	function adjustHP(delta: number) {
		const newCurrent = Math.max(0, Math.min(hitPoints.current + delta, hitPoints.maximum));
		onHPChange(newCurrent, hitPoints.temporary);
	}

	function adjustTempHP(delta: number) {
		const newTemp = Math.max(0, hitPoints.temporary + delta);
		onHPChange(hitPoints.current, newTemp);
	}

	function applyHPDelta() {
		const val = parseInt(hpDelta, 10);
		if (!isNaN(val) && val !== 0) adjustHP(val);
		hpDelta = '';
	}

	function applyTempHPDelta() {
		const val = parseInt(tempHPDelta, 10);
		if (!isNaN(val) && val !== 0) adjustTempHP(val);
		tempHPDelta = '';
	}
</script>

<Card.Root class="py-3 gap-2">
	<Card.Header class="px-4 pb-1">
		<Card.Title class="text-sm flex items-center gap-2">
			<Sparkles class="size-4 text-muted-foreground" />
			Resources
		</Card.Title>
	</Card.Header>
	<Card.Content class="px-4 space-y-4">

		<!-- Hit Points -->
		<div>
			<div class="flex items-center gap-2 mb-2">
				<Heart class="size-4 text-red-500" />
				<span class="text-sm font-medium">Hit Points</span>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="outline" size="icon-sm" onclick={() => adjustHP(-1)} disabled={hitPoints.current <= 0}>
					<Minus class="size-3" />
				</Button>
				<div class="flex-1 flex items-center justify-center gap-2">
					<span class={cn(
						'text-xl font-bold tabular-nums',
						hitPoints.current <= hitPoints.maximum * 0.25 && 'text-red-500',
						hitPoints.current <= hitPoints.maximum * 0.5 && hitPoints.current > hitPoints.maximum * 0.25 && 'text-yellow-500'
					)}>
						{hitPoints.current}
					</span>
					<span class="text-muted-foreground"> / {hitPoints.maximum}</span>
					<input
						type="text"
						inputmode="numeric"
						bind:value={hpDelta}
						onkeydown={(e) => { if (e.key === 'Enter') applyHPDelta(); }}
						placeholder="+/-"
						class="w-14 h-7 rounded-md border border-border bg-background px-2 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
					/>
				</div>
				<Button variant="outline" size="icon-sm" onclick={() => adjustHP(1)} disabled={hitPoints.current >= hitPoints.maximum}>
					<Plus class="size-3" />
				</Button>
			</div>
			{#if true}
				<div class="flex items-center gap-2 mt-1.5">
					<Button variant="ghost" size="icon-sm" onclick={() => adjustTempHP(-1)} disabled={hitPoints.temporary <= 0}>
						<Minus class="size-3" />
					</Button>
					<div class="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground">
						<span class="tabular-nums font-medium">{hitPoints.temporary}</span> temp HP
						<input
							type="text"
							inputmode="numeric"
							bind:value={tempHPDelta}
							onkeydown={(e) => { if (e.key === 'Enter') applyTempHPDelta(); }}
							placeholder="+/-"
							class="w-14 h-7 rounded-md border border-border bg-background px-2 text-center text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-ring"
						/>
					</div>
					<Button variant="ghost" size="icon-sm" onclick={() => adjustTempHP(1)}>
						<Plus class="size-3" />
					</Button>
				</div>
			{/if}
		</div>

		<!-- Hit Dice -->
		{#if hitPoints.hitDice.length > 0}
			<div>
				<div class="text-sm font-medium mb-1.5">Hit Dice</div>
				<div class="flex flex-wrap gap-2">
					{#each hitPoints.hitDice as hd, i}
						{@const remaining = hd.total - hd.used}
						<div class="flex items-center gap-1.5 rounded-md border border-border px-2 py-1">
							<span class="text-xs text-muted-foreground">{hd.die}</span>
							<Button variant="ghost" size="icon-sm" class="size-5"
								onclick={() => onHitDiceChange(i, Math.min(hd.used + 1, hd.total))}
								disabled={remaining <= 0}>
								<Minus class="size-3" />
							</Button>
							<span class="tabular-nums text-sm font-medium w-8 text-center">{remaining}/{hd.total}</span>
							<Button variant="ghost" size="icon-sm" class="size-5"
								onclick={() => onHitDiceChange(i, Math.max(hd.used - 1, 0))}
								disabled={hd.used <= 0}>
								<Plus class="size-3" />
							</Button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Spell Slots -->
		{#if spellSlotResources.slots.length > 0}
			<div>
				<div class="text-sm font-medium mb-1.5">Spell Slots</div>
				<div class="space-y-1.5">
					{#each spellSlotResources.slots as slot}
						<div class="flex items-center gap-2">
							<span class="text-xs text-muted-foreground w-10">Lv {slot.level}</span>
							<div class="flex gap-1">
								{#each Array(slot.maximum) as _, i}
									{@const isUsed = i < slot.used}
									<button
										class={cn(
											'size-5 rounded-full border-2 transition-colors',
											isUsed
												? 'border-muted-foreground bg-muted-foreground/20'
												: 'border-primary bg-primary/80 hover:bg-primary'
										)}
										onclick={() => onSpellSlotChange(slot.level, isUsed ? i : i + 1)}
										aria-label={isUsed ? `Restore level ${slot.level} slot` : `Use level ${slot.level} slot`}
									></button>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Pact Slots -->
		{#if spellSlotResources.pactSlots}
			{@const pact = spellSlotResources.pactSlots}
			<div>
				<div class="text-sm font-medium mb-1.5">Pact Slots <Badge variant="secondary" class="ml-1 text-xs">Lv {pact.level}</Badge></div>
				<div class="flex gap-1">
					{#each Array(pact.maximum) as _, i}
						{@const isUsed = i < pact.used}
						<button
							class={cn(
								'size-5 rounded-full border-2 transition-colors',
								isUsed
									? 'border-muted-foreground bg-muted-foreground/20'
									: 'border-violet-500 bg-violet-500/80 hover:bg-violet-500'
							)}
							onclick={() => onPactSlotChange(isUsed ? i : i + 1)}
							aria-label={isUsed ? 'Restore pact slot' : 'Use pact slot'}
						></button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Class Resources -->
		{#if resources.length > 0}
			<div>
				<div class="text-sm font-medium mb-1.5">Class Resources</div>
				<div class="space-y-2">
					{#each resources as resource}
						<div class="flex items-center gap-2 rounded-md border border-border px-3 py-2">
							<div class="flex-1">
								<div class="text-sm font-medium">{resource.name}</div>
								<div class="text-xs text-muted-foreground">
									{resource.recovery === 'short' ? 'Short rest' : resource.recovery === 'long' ? 'Long rest' : 'No'} recovery
								</div>
							</div>
							<Button variant="outline" size="icon-sm"
								onclick={() => onResourceChange(resource.key, Math.min(resource.used + 1, resource.maximum))}
								disabled={resource.remaining <= 0}>
								<Minus class="size-3" />
							</Button>
							<span class="tabular-nums text-sm font-bold w-10 text-center">{resource.remaining}/{resource.maximum}</span>
							<Button variant="outline" size="icon-sm"
								onclick={() => onResourceChange(resource.key, Math.max(resource.used - 1, 0))}
								disabled={resource.used <= 0}>
								<Plus class="size-3" />
							</Button>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Rest Buttons -->
		<div class="flex gap-2 pt-2 border-t border-border">
			<Button variant="outline" class="flex-1 gap-2" onclick={onShortRest}>
				<Moon class="size-4" />
				Short Rest
			</Button>
			<Button variant="outline" class="flex-1 gap-2" onclick={onLongRest}>
				<Sun class="size-4" />
				Long Rest
			</Button>
		</div>

	</Card.Content>
</Card.Root>
