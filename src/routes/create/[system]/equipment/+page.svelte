<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { EquipmentDefinition, ClassDefinition } from '$lib/types/content-pack.js';
	import type { EquipmentSelection } from '$lib/types/character.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import SelectionCard from '$lib/components/ui/selection-card/SelectionCard.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Plus, X, Search } from 'lucide-svelte';

	const wizNav = getContext<any>('wizard-nav');

	const { pack, systemId } = $derived($page.data as { pack: any; systemId: string });
	const equipment: EquipmentDefinition[] = $derived(pack?.equipment ?? []);
	const classes: ClassDefinition[] = $derived(pack?.classes ?? []);

	const characterClass = $derived(() => {
		const char = wizardStore.getCharacter();
		if (!char?.classes[0]) return null;
		return classes.find((c) => c.id === char.classes[0].classId) ?? null;
	});

	/** Map equipment IDs to definitions for quick lookup */
	const equipmentMap = $derived(() => {
		const map = new Map<string, EquipmentDefinition>();
		for (const item of equipment) {
			map.set(item.id, item);
		}
		return map;
	});

	let selectedEquipment = $state<EquipmentSelection[]>(
		wizardStore.getCharacter()?.equipment ?? []
	);

	let showSearch = $state(false);
	let searchQuery = $state('');
	let initialized = $state(false);

	// Auto-populate starting equipment on first visit (no saved equipment yet)
	$effect(() => {
		if (initialized) return;
		initialized = true;
		const saved = wizardStore.getCharacter()?.equipment;
		if (saved && saved.length > 0) return; // User already has equipment saved
		const cls = characterClass();
		if (!cls?.startingEquipment) return;
		const items: EquipmentSelection[] = [];
		for (const option of cls.startingEquipment) {
			for (const item of option.items) {
				// For choice items, pick the first option as default
				const equipId = item.isChoice && item.choices?.length
					? item.choices[0]
					: item.equipmentId;
				// Only add if we can resolve the equipment
				if (equipmentMap().has(equipId)) {
					items.push({ equipmentId: equipId, quantity: item.quantity, equipped: true });
				}
			}
		}
		if (items.length > 0) {
			selectedEquipment = items;
		}
	});

	function removeEquipment(equipId: string) {
		selectedEquipment = selectedEquipment.filter((e) => e.equipmentId !== equipId);
	}

	function toggleEquipment(equipId: string) {
		const idx = selectedEquipment.findIndex((e) => e.equipmentId === equipId);
		if (idx >= 0) {
			selectedEquipment = selectedEquipment.filter((_, i) => i !== idx);
		} else {
			selectedEquipment = [
				...selectedEquipment,
				{ equipmentId: equipId, quantity: 1, equipped: true }
			];
		}
	}

	function isSelected(equipId: string): boolean {
		return selectedEquipment.some((e) => e.equipmentId === equipId);
	}

	const searchResults = $derived(() => {
		if (searchQuery.length < 2) return [];
		const q = searchQuery.toLowerCase();
		return equipment.filter((item) => item.name.toLowerCase().includes(q));
	});

	const categoryDefs: { label: string; types: string[] }[] = [
		{ label: 'Weapons', types: ['weapon'] },
		{ label: 'Armor & Shields', types: ['armor', 'shield'] },
		{ label: 'Adventuring Gear', types: ['adventuring-gear', 'ammunition', 'holy-symbol', 'arcane-focus', 'druidic-focus'] },
		{ label: 'Tools', types: ['tool'] },
		{ label: 'Other', types: ['mount', 'vehicle'] },
	];

	const equipmentByCategory = $derived(() => {
		const knownTypes = new Set(categoryDefs.flatMap((c) => c.types));
		const result: { label: string; items: EquipmentDefinition[] }[] = [];
		for (const cat of categoryDefs) {
			const typeSet = new Set(cat.types);
			const items = equipment.filter((item) => typeSet.has(item.type));
			if (cat.label === 'Other') {
				// Also include any types not covered by other categories
				const otherItems = equipment.filter((item) => !knownTypes.has(item.type));
				items.push(...otherItems);
			}
			if (items.length > 0) {
				result.push({ label: cat.label, items });
			}
		}
		return result;
	});

	const isSearching = $derived(() => searchQuery.length >= 2);

	const nextPath = $derived(wizNav.getNextStepPath('equipment'));
	const nextLabel = $derived(`Next: ${wizNav.getNextStepLabel('equipment')}`);

	function proceed() {
		wizardStore.updateCharacter({ equipment: selectedEquipment });
		wizardStore.completeStep();
		goto(`/create/${systemId}/${nextPath}`);
	}
</script>

<svelte:head>
	<title>Equipment - OpenPentacle</title>
</svelte:head>

<div>
	<PageHeader
		as="h1"
		title="Starting Equipment"
		description="Your class starting equipment is pre-selected. Add or remove items as needed."
	/>

	<!-- Top nav -->
	<WizardNav
		backHref={wizNav.getPrevStepPath('equipment') ? `/create/${systemId}/${wizNav.getPrevStepPath('equipment')}` : `/create/${systemId}/skills`}
		backLabel="Back"
		nextLabel={nextLabel}
		onNext={proceed}
		compact
	/>

	<!-- Selected equipment summary -->
	<Card.Root class="mt-4">
		<Card.Header>
			<Card.Title class="text-base">
				{#if characterClass()}
					{characterClass()!.name} Starting Equipment
				{:else}
					Selected Equipment
				{/if}
			</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if selectedEquipment.length === 0}
				<p class="text-sm text-muted-foreground">No equipment selected.</p>
			{:else}
				<ul class="space-y-2">
					{#each selectedEquipment as sel}
						{@const item = equipmentMap().get(sel.equipmentId)}
						{#if item}
							<li class="flex items-center justify-between rounded-md border border-border px-3 py-2">
								<div>
									<span class="text-sm font-medium">
										{#if sel.quantity > 1}{sel.quantity}x {/if}{item.name}
									</span>
									<span class="ml-2 text-xs text-muted-foreground">
										{item.cost.amount} {item.cost.currency}
										{#if item.weight > 0}&middot; {item.weight} lb{/if}
									</span>
								</div>
								<Button
									variant="ghost"
									size="icon-sm"
									onclick={() => removeEquipment(sel.equipmentId)}
								>
									<X class="size-3" />
								</Button>
							</li>
						{/if}
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Add other equipment -->
	{#if !showSearch}
		<Button
			variant="outline"
			class="mt-4"
			onclick={() => showSearch = true}
		>
			<Plus class="size-4" />
			Add other equipment
		</Button>
	{:else}
		<Card.Root class="mt-4">
			<Card.Header class="flex-row items-center justify-between gap-2 space-y-0">
				<Card.Title class="text-base">Add Equipment</Card.Title>
				<Button
					variant="ghost"
					size="icon-sm"
					onclick={() => { showSearch = false; searchQuery = ''; }}
				>
					<X class="size-4" />
				</Button>
			</Card.Header>
			<Card.Content>
				<div class="relative">
					<Search class="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder="Search equipment..."
						value={searchQuery}
						oninput={(e: Event) => searchQuery = (e.target as HTMLInputElement).value}
						class="pl-9"
					/>
				</div>
				{#if searchQuery.length > 0 && searchQuery.length < 2}
					<p class="mt-2 text-xs text-muted-foreground">Type at least 2 characters to search.</p>
				{/if}
				{@const results = searchResults()}
				{#if results.length > 0}
					<div class="mt-3 grid gap-2 sm:grid-cols-2" role="listbox" aria-label="Search results">
						{#each results as item}
							<SelectionCard
								selected={isSelected(item.id)}
								onclick={() => toggleEquipment(item.id)}
								compact
							>
								<div class="font-medium">{item.name}</div>
								<div class="text-xs text-muted-foreground">
									{item.cost.amount} {item.cost.currency}
									{#if item.weight > 0}&middot; {item.weight} lb{/if}
								</div>
								{#if item.weapon}
									<div class="text-xs text-muted-foreground">
										{item.weapon.damage} {item.weapon.damageType}
									</div>
								{/if}
								{#if item.armor}
									<div class="text-xs text-muted-foreground">
										AC {item.armor.baseAC}
										{#if item.armor.stealthDisadvantage}(Stealth Disadvantage){/if}
									</div>
								{/if}
							</SelectionCard>
						{/each}
					</div>
				{:else if isSearching()}
					<p class="mt-3 text-sm text-muted-foreground">No equipment found matching "{searchQuery}".</p>
				{/if}

				{#if !isSearching()}
					{@const categories = equipmentByCategory()}
					{#if categories.length > 0}
						<Tabs.Root value={categories[0].label} class="mt-4">
							<Tabs.List class="flex flex-wrap">
								{#each categories as cat}
									<Tabs.Trigger value={cat.label}>{cat.label}</Tabs.Trigger>
								{/each}
							</Tabs.List>
							{#each categories as cat}
								<Tabs.Content value={cat.label}>
									<div class="mt-3 grid gap-2 sm:grid-cols-2">
										{#each cat.items as item}
											<SelectionCard
												selected={isSelected(item.id)}
												onclick={() => toggleEquipment(item.id)}
												compact
											>
												<div class="font-medium">{item.name}</div>
												<div class="text-xs text-muted-foreground">
													{item.cost.amount} {item.cost.currency}
													{#if item.weight > 0}&middot; {item.weight} lb{/if}
												</div>
												{#if item.weapon}
													<div class="text-xs text-muted-foreground">
														{item.weapon.damage} {item.weapon.damageType}
													</div>
												{/if}
												{#if item.armor}
													<div class="text-xs text-muted-foreground">
														AC {item.armor.baseAC}
														{#if item.armor.stealthDisadvantage}(Stealth Disadvantage){/if}
													</div>
												{/if}
											</SelectionCard>
										{/each}
									</div>
								</Tabs.Content>
							{/each}
						</Tabs.Root>
					{/if}
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<WizardNav
		backHref={wizNav.getPrevStepPath('equipment') ? `/create/${systemId}/${wizNav.getPrevStepPath('equipment')}` : `/create/${systemId}/skills`}
		backLabel="Back"
		nextLabel={nextLabel}
		onNext={proceed}
	/>
</div>
