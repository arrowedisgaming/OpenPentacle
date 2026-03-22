<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import type { ContentPack, EquipmentDefinition } from '$lib/types/content-pack.js';
	import type { CharacterData, EquipmentSelection } from '$lib/types/character.js';
	import { kebabToTitle } from '$lib/utils/format.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { ArrowLeft, Plus, Trash2 } from 'lucide-svelte';

	const { character, pack } = $derived($page.data as {
		character: { id: string; data: CharacterData };
		pack: ContentPack;
	});

	// Editable local copies
	let name = $state(character.data.name);
	let currentHP = $state(character.data.hitPoints.current);
	let tempHP = $state(character.data.hitPoints.temporary);
	let equipment = $state<EquipmentSelection[]>(structuredClone(character.data.equipment));
	let cp = $state(character.data.currency.cp);
	let sp = $state(character.data.currency.sp);
	let ep = $state(character.data.currency.ep);
	let gp = $state(character.data.currency.gp);
	let pp = $state(character.data.currency.pp);

	// Flavor fields
	let appearance = $state(character.data.flavor?.appearance ?? '');
	let backstory = $state(character.data.flavor?.backstory ?? '');
	let personalityTraits = $state(character.data.flavor?.personalityTraits ?? '');
	let ideals = $state(character.data.flavor?.ideals ?? '');
	let bonds = $state(character.data.flavor?.bonds ?? '');
	let flaws = $state(character.data.flavor?.flaws ?? '');

	// Equipment management
	let addEquipmentId = $state('');

	const availableEquipment = $derived(
		pack.equipment.filter((e) => !equipment.some((eq) => eq.equipmentId === e.id))
	);

	function addEquipment() {
		if (!addEquipmentId) return;
		equipment = [...equipment, { equipmentId: addEquipmentId, quantity: 1, equipped: true }];
		addEquipmentId = '';
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

		const updatedData: CharacterData = {
			...character.data,
			name,
			hitPoints: {
				...character.data.hitPoints,
				current: currentHP,
				temporary: tempHP
			},
			equipment,
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
		<Card.Root>
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

				<div class="flex gap-2">
					<select
						bind:value={addEquipmentId}
						class="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
					>
						<option value="">Add equipment...</option>
						{#each availableEquipment as item}
							<option value={item.id}>{item.name}</option>
						{/each}
					</select>
					<Button variant="outline" size="sm" onclick={addEquipment} disabled={!addEquipmentId} class="gap-1">
						<Plus class="size-4" />
						Add
					</Button>
				</div>
			</Card.Content>
		</Card.Root>

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
