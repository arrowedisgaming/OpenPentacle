<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { ContentPack, SpellDefinition } from '$lib/types/content-pack.js';
	import type { CharacterData, EquipmentSelection } from '$lib/types/character.js';
	import { kebabToTitle } from '$lib/utils/format.js';
	import { computePreparedSpellContext, getAvailableSpellsForPreparation, getAvailableCantripsForSwap } from '$lib/engine/prepared-spells.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import PreparedSpellEditor from '$lib/components/edit/PreparedSpellEditor.svelte';
	import CantripEditor from '$lib/components/edit/CantripEditor.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowLeft, Plus, Trash2, Search } from 'lucide-svelte';

	const { character, pack } = $derived($page.data as {
		character: { id: string; data: CharacterData };
		pack: ContentPack;
	});

	// Editable local copies
	let name = $state('');
	let currentHP = $state(0);
	let tempHP = $state(0);
	let equipment = $state<EquipmentSelection[]>([]);
	let cp = $state(0);
	let sp = $state(0);
	let ep = $state(0);
	let gp = $state(0);
	let pp = $state(0);

	// Flavor fields
	let appearance = $state('');
	let backstory = $state('');
	let personalityTraits = $state('');
	let ideals = $state('');
	let bonds = $state('');
	let flaws = $state('');
	let hasInitializedForm = $state(false);

	// Prepared spells
	let preparedSpellIds = $state<Set<string>>(new Set());

	// Cantrip swapping (wizard only)
	let cantripIds = $state<Set<string>>(new Set());

	// Open5E spell merging
	let open5eSpells = $state<SpellDefinition[]>([]);

	$effect(() => {
		if (hasInitializedForm) return;
		name = character.data.name;
		currentHP = character.data.hitPoints.current;
		tempHP = character.data.hitPoints.temporary;
		equipment = structuredClone(character.data.equipment);
		cp = character.data.currency.cp;
		sp = character.data.currency.sp;
		ep = character.data.currency.ep;
		gp = character.data.currency.gp;
		pp = character.data.currency.pp;
		appearance = character.data.flavor?.appearance ?? '';
		backstory = character.data.flavor?.backstory ?? '';
		personalityTraits = character.data.flavor?.personalityTraits ?? '';
		ideals = character.data.flavor?.ideals ?? '';
		bonds = character.data.flavor?.bonds ?? '';
		flaws = character.data.flavor?.flaws ?? '';
		preparedSpellIds = new Set(character.data.spells?.preparedSpellIds ?? []);
		cantripIds = new Set(
			character.data.spells.knownSpells
				.filter((s) => s.source.startsWith('class:') && allSpells.find((sp) => sp.id === s.spellId)?.level === 0)
				.map((s) => s.spellId)
		);
		hasInitializedForm = true;
	});

	// Fetch Open5E spells on mount if character has external sources
	onMount(async () => {
		const sources = character.data.open5eSources;
		if (!sources?.length) return;
		try {
			const res = await fetch(`/api/open5e/spells?sources=${sources.join(',')}`);
			if (res.ok) {
				open5eSpells = await res.json();
			}
		} catch {
			// Silently fail — user still has built-in spells
		}
	});

	// Merge built-in + Open5E spells (dedup by name, built-in wins)
	const allSpells: SpellDefinition[] = $derived.by(() => {
		const base: SpellDefinition[] = pack?.spells ?? [];
		if (open5eSpells.length === 0) return base;
		const baseNames = new Set(base.map((s) => s.name.toLowerCase()));
		return [...base, ...open5eSpells.filter((s) => !baseNames.has(s.name.toLowerCase()))];
	});

	// Prepared spell context (null if non-caster)
	const classDef = $derived(
		pack.classes.find((c) => c.id === character.data.classes[0]?.classId) ?? null
	);
	const preparedContext = $derived(
		classDef ? computePreparedSpellContext(character.data, classDef, pack) : null
	);
	const availableSpellsForPrep = $derived(
		preparedContext
			? getAvailableSpellsForPreparation(preparedContext, character.data.spells.knownSpells, allSpells)
			: []
	);
	const availableCantrips = $derived(
		preparedContext?.canSwapCantrips
			? getAvailableCantripsForSwap(preparedContext, allSpells)
			: []
	);

	// Equipment management
	let equipmentSearch = $state('');

	const availableEquipment = $derived(
		pack.equipment.filter((e) => !equipment.some((eq) => eq.equipmentId === e.id))
	);

	const filteredEquipment = $derived.by(() => {
		if (!equipmentSearch.trim()) return [];
		const q = equipmentSearch.trim().toLowerCase();
		return availableEquipment.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 8);
	});

	function addEquipmentById(id: string) {
		equipment = [...equipment, { equipmentId: id, quantity: 1, equipped: true }];
		equipmentSearch = '';
	}

	function removeEquipment(idx: number) {
		equipment = equipment.filter((_, i) => i !== idx);
	}

	function toggleEquipped(idx: number) {
		equipment = equipment.map((eq, i) => i === idx ? { ...eq, equipped: !eq.equipped } : eq);
	}

	function updateQuantity(idx: number, val: number) {
		equipment = equipment.map((eq, i) => i === idx ? { ...eq, quantity: Math.max(1, val) } : eq);
	}

	// Save
	let saving = $state(false);
	let error = $state('');

	async function save() {
		saving = true;
		error = '';

		// Build updated knownSpells if cantrips were swapped
		let updatedKnownSpells = [...character.data.spells.knownSpells];
		let updatedPreparedIds = [...preparedSpellIds];
		if (preparedContext?.canSwapCantrips) {
			const classSource = `class:${character.data.classes[0]?.classId}`;
			// Remove old class cantrips
			updatedKnownSpells = updatedKnownSpells.filter(
				(s) => !(s.source === classSource && allSpells.find((sp) => sp.id === s.spellId)?.level === 0)
			);
			// Add current cantrip selections
			for (const id of cantripIds) {
				updatedKnownSpells.push({ spellId: id, source: classSource, alwaysPrepared: true });
			}
			// Update preparedSpellIds: remove only class-list cantrips, preserve feat/origin cantrips
			const classListCantripIds = new Set(
				allSpells.filter((s) => s.level === 0 && s.lists.includes(preparedContext.spellListId)).map((s) => s.id)
			);
			updatedPreparedIds = updatedPreparedIds.filter((id) => !classListCantripIds.has(id));
			updatedPreparedIds.push(...cantripIds);
		}

		const updatedData: CharacterData = {
			...character.data,
			name,
			hitPoints: {
				...character.data.hitPoints,
				current: currentHP,
				temporary: tempHP
			},
			equipment,
			spells: {
				...character.data.spells,
				knownSpells: updatedKnownSpells,
				preparedSpellIds: updatedPreparedIds
			},
			currency: { cp, sp, ep, gp, pp },
			flavor: {
				...character.data.flavor,
				appearance: appearance || undefined,
				backstory: backstory || undefined,
				personalityTraits: personalityTraits || undefined,
				ideals: ideals || undefined,
				bonds: bonds || undefined,
				flaws: flaws || undefined
			}
		};

		try {
			const res = await fetch(`/api/characters/${character.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updatedData)
			});
			if (res.ok) {
				goto(`/sheet/${character.id}`);
			} else {
				const body = await res.json().catch(() => ({}));
				error = body.message ?? 'Failed to save. Please try again.';
			}
		} catch {
			error = 'Network error. Please try again.';
		} finally {
			saving = false;
		}
	}

	function resolveEquipmentName(id: string): string {
		return pack.equipment.find((e) => e.id === id)?.name ?? kebabToTitle(id);
	}
</script>

<svelte:head>
	<title>Edit {character.data.name} - OpenPentacle</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-6 animate-fade-in">
	<Button variant="ghost" href="/sheet/{character.id}" class="mb-4 gap-2">
		<ArrowLeft class="size-4" />
		Back to Character Sheet
	</Button>

	<PageHeader
		as="h1"
		title="Edit Character"
		description="{character.data.name} — Level {character.data.level} {kebabToTitle(character.data.classes[0]?.classId ?? '')}"
	/>

	<div class="mt-6 space-y-6">
		<!-- Name -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Character Name</Card.Title>
			</Card.Header>
			<Card.Content>
				<Input bind:value={name} placeholder="Character name" />
			</Card.Content>
		</Card.Root>

		<!-- Hit Points -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Hit Points</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="flex gap-4">
					<div class="flex-1">
						<Label for="current-hp" class="text-sm">Current HP</Label>
						<Input id="current-hp" type="number" min={0} max={character.data.hitPoints.maximum} bind:value={currentHP} />
						<span class="text-xs text-muted-foreground">Max: {character.data.hitPoints.maximum}</span>
					</div>
					<div class="flex-1">
						<Label for="temp-hp" class="text-sm">Temporary HP</Label>
						<Input id="temp-hp" type="number" min={0} bind:value={tempHP} />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Equipment -->
		<Card.Root class={equipmentSearch.trim() ? 'relative z-20' : ''}>
			<Card.Header>
				<Card.Title class="text-base">Equipment</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#each equipment as item, idx}
					<div class="flex items-center gap-2">
						<button
							class="rounded border px-2 py-1 text-xs transition-colors {item.equipped ? 'border-primary bg-primary/10' : 'border-border'}"
							onclick={() => toggleEquipped(idx)}
						>
							{item.equipped ? 'Equipped' : 'Stowed'}
						</button>
						<span class="flex-1 text-sm">{resolveEquipmentName(item.equipmentId)}</span>
						<Input
							type="number"
							min={1}
							value={item.quantity}
							oninput={(e) => updateQuantity(idx, parseInt((e.target as HTMLInputElement).value, 10) || 1)}
							class="w-16"
						/>
						<Button variant="ghost" size="sm" onclick={() => removeEquipment(idx)}>
							<Trash2 class="size-4 text-destructive" />
						</Button>
					</div>
				{/each}

				<Separator />

				<div class="relative">
					<Search class="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
					<Input
						type="text"
						placeholder="Type to find equipment..."
						bind:value={equipmentSearch}
						class="pl-9"
					/>
					{#if filteredEquipment.length > 0}
						<div class="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-md">
							{#each filteredEquipment as item}
								<button
									class="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent text-left"
									onclick={() => addEquipmentById(item.id)}
								>
									<Plus class="size-3.5 text-muted-foreground shrink-0" />
									<span>{item.name}</span>
									{#if item.type}
										<Badge variant="outline" class="ml-auto text-xs capitalize">{item.type}</Badge>
									{/if}
								</button>
							{/each}
						</div>
					{:else if equipmentSearch.trim()}
						<div class="absolute z-30 mt-1 w-full rounded-md border bg-popover shadow-md px-3 py-2 text-sm text-muted-foreground">
							No matching equipment
						</div>
					{/if}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Cantrip Swapping (wizard only) -->
		{#if preparedContext?.canSwapCantrips && availableCantrips.length > 0}
			<CantripEditor
				maxCantrips={preparedContext.maxCantrips}
				currentCantripIds={cantripIds}
				{availableCantrips}
				onchange={(ids) => { cantripIds = ids; }}
			/>
		{/if}

		<!-- Prepared Spells (only for spellcasting classes) -->
		{#if preparedContext}
			<PreparedSpellEditor
				context={preparedContext}
				currentPreparedIds={preparedSpellIds}
				availableSpells={availableSpellsForPrep}
				onchange={(ids) => { preparedSpellIds = ids; }}
			/>
		{/if}

		<!-- Currency -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Currency</Card.Title>
			</Card.Header>
			<Card.Content>
				<div class="grid grid-cols-5 gap-2">
					<div>
						<Label for="cp" class="text-xs text-muted-foreground">CP</Label>
						<Input id="cp" type="number" min={0} bind:value={cp} />
					</div>
					<div>
						<Label for="sp" class="text-xs text-muted-foreground">SP</Label>
						<Input id="sp" type="number" min={0} bind:value={sp} />
					</div>
					<div>
						<Label for="ep" class="text-xs text-muted-foreground">EP</Label>
						<Input id="ep" type="number" min={0} bind:value={ep} />
					</div>
					<div>
						<Label for="gp" class="text-xs text-muted-foreground">GP</Label>
						<Input id="gp" type="number" min={0} bind:value={gp} />
					</div>
					<div>
						<Label for="pp" class="text-xs text-muted-foreground">PP</Label>
						<Input id="pp" type="number" min={0} bind:value={pp} />
					</div>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Flavor -->
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">Character Details</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3">
				<div>
					<Label for="personality" class="text-sm">Personality Traits</Label>
					<textarea id="personality" bind:value={personalityTraits} rows={2} class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
				</div>
				<div>
					<Label for="ideals" class="text-sm">Ideals</Label>
					<textarea id="ideals" bind:value={ideals} rows={2} class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
				</div>
				<div>
					<Label for="bonds" class="text-sm">Bonds</Label>
					<textarea id="bonds" bind:value={bonds} rows={2} class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
				</div>
				<div>
					<Label for="flaws" class="text-sm">Flaws</Label>
					<textarea id="flaws" bind:value={flaws} rows={2} class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
				</div>
				<div>
					<Label for="appearance" class="text-sm">Appearance</Label>
					<textarea id="appearance" bind:value={appearance} rows={2} class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
				</div>
				<div>
					<Label for="backstory" class="text-sm">Backstory</Label>
					<textarea id="backstory" bind:value={backstory} rows={4} class="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"></textarea>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Error display -->
		{#if error}
			<Alert.Root variant="destructive">
				<Alert.Description>{error}</Alert.Description>
			</Alert.Root>
		{/if}

		<!-- Action buttons -->
		<div class="flex justify-end gap-3 pb-8">
			<Button variant="outline" href="/sheet/{character.id}">
				Cancel
			</Button>
			<Button
				onclick={save}
				disabled={saving || !name.trim()}
				size="lg"
			>
				{saving ? 'Saving...' : 'Save Changes'}
			</Button>
		</div>
	</div>
</div>
