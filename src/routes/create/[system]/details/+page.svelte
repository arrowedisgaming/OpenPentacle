<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { getContext } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.js';
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import WizardNav from '$lib/components/wizard/WizardNav.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';

	const wizNav = getContext<any>('wizard-nav');
	const { systemId } = $derived($page.data as { systemId: string });
	const prevPath = $derived(wizNav.getPrevStepPath('details'));

	let name = $state(wizardStore.getCharacter()?.name ?? '');
	let appearance = $state(wizardStore.getCharacter()?.flavor?.appearance ?? '');
	let backstory = $state(wizardStore.getCharacter()?.flavor?.backstory ?? '');
	let personalityTraits = $state(wizardStore.getCharacter()?.flavor?.personalityTraits ?? '');
	let ideals = $state(wizardStore.getCharacter()?.flavor?.ideals ?? '');
	let bonds = $state(wizardStore.getCharacter()?.flavor?.bonds ?? '');
	let flaws = $state(wizardStore.getCharacter()?.flavor?.flaws ?? '');

	function proceed() {
		if (!name.trim()) return;
		wizardStore.updateCharacter({
			name: name.trim(),
			flavor: {
				appearance: appearance || undefined,
				backstory: backstory || undefined,
				personalityTraits: personalityTraits || undefined,
				ideals: ideals || undefined,
				bonds: bonds || undefined,
				flaws: flaws || undefined
			}
		});
		wizardStore.completeStep();
		goto(`/create/${systemId}/review`);
	}
</script>

<svelte:head>
	<title>Character Details - OpenPentacle</title>
</svelte:head>

<div>
	<PageHeader
		as="h1"
		title="Character Details"
		description="Give your character a name and flesh out their personality."
	/>

	<WizardNav
		backHref="/create/{systemId}/{prevPath}"
		backLabel="Back"
		nextLabel="Next: Review"
		onNext={proceed}
		nextDisabled={!name.trim()}
		compact
	/>

	<Card.Root class="mt-6 max-w-xl">
		<Card.Content class="space-y-4 pt-6">
			<div class="space-y-2">
				<Label for="name">Character Name *</Label>
				<Input
					id="name"
					type="text"
					bind:value={name}
					placeholder="Enter character name"
				/>
			</div>

			<div class="space-y-2">
				<Label for="personality">Personality Traits</Label>
				<Textarea
					id="personality"
					bind:value={personalityTraits}
					rows={2}
					placeholder="I'm always polite and respectful..."
				/>
			</div>

			<div class="space-y-2">
				<Label for="ideals">Ideals</Label>
				<Textarea
					id="ideals"
					bind:value={ideals}
					rows={2}
					placeholder="Power. Knowledge is the path to power..."
				/>
			</div>

			<div class="space-y-2">
				<Label for="bonds">Bonds</Label>
				<Textarea
					id="bonds"
					bind:value={bonds}
					rows={2}
					placeholder="I seek to preserve a sacred text..."
				/>
			</div>

			<div class="space-y-2">
				<Label for="flaws">Flaws</Label>
				<Textarea
					id="flaws"
					bind:value={flaws}
					rows={2}
					placeholder="I am easily distracted by the promise of information..."
				/>
			</div>

			<div class="space-y-2">
				<Label for="appearance">Appearance</Label>
				<Textarea
					id="appearance"
					bind:value={appearance}
					rows={3}
					placeholder="Describe your character's appearance..."
				/>
			</div>

			<div class="space-y-2">
				<Label for="backstory">Backstory</Label>
				<Textarea
					id="backstory"
					bind:value={backstory}
					rows={4}
					placeholder="Write your character's backstory..."
				/>
			</div>
		</Card.Content>
	</Card.Root>

	<WizardNav
		backHref="/create/{systemId}/{prevPath}"
		backLabel="Back"
		nextLabel="Next: Review"
		onNext={proceed}
		nextDisabled={!name.trim()}
	/>
</div>
