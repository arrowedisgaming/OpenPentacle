<script lang="ts">
	import { page } from '$app/stores';
	import { setContext } from 'svelte';
	import { wizardStore } from '$lib/stores/wizard.js';
	import type { ContentPack } from '$lib/types/content-pack.js';
	import { getSubclassLevel, getASILevels } from '$lib/engine/class-progression.js';
	import WizardShell from '$lib/components/wizard/WizardShell.svelte';
	import { onDestroy } from 'svelte';

	let { children } = $props();

	const systemId = $derived($page.params.system ?? '');
	const pack = $derived(($page.data as { pack?: ContentPack }).pack);

	// Read character state reactively with proper cleanup
	let wizState = $state(wizardStore.getCharacter());
	const unsubscribe = wizardStore.subscribe((s) => { wizState = s.character; });
	onDestroy(unsubscribe);
	const character = $derived(wizState ?? null);

	// Resolve the selected class definition
	const classDef = $derived.by(() => {
		const classId = character?.classes?.[0]?.classId;
		if (!classId || !pack) return undefined;
		return pack.classes.find((c) => c.id === classId);
	});

	const charLevel = $derived(character?.level ?? 1);
	const subclassTrigger = $derived(classDef ? getSubclassLevel(classDef) : null);
	const asiLevels = $derived(classDef ? getASILevels(classDef) : []);
	const hasSpellcasting = $derived(!!classDef?.spellcasting);
	const hasASIOrFeats = $derived(
		asiLevels.some((l) => l <= charLevel) || !!character?.background?.backgroundId
	);

	// Full step definitions with visibility predicates
	const allSteps = $derived([
		{ id: 'class', label: 'Class', path: 'class' },
		{
			id: 'subclass', label: 'Subclass', path: 'subclass', conditional: true,
			visible: subclassTrigger !== null && charLevel >= subclassTrigger
		},
		{ id: 'origin', label: 'Origin', path: 'origin' },
		{ id: 'abilities', label: 'Abilities', path: 'abilities' },
		{ id: 'background', label: 'Background', path: 'background' },
		{ id: 'skills', label: 'Skills', path: 'skills' },
		{ id: 'equipment', label: 'Equipment', path: 'equipment' },
		{
			id: 'spells', label: 'Spells', path: 'spells', conditional: true,
			visible: hasSpellcasting
		},
		{
			id: 'feats', label: 'ASI & Feats', path: 'feats', conditional: true,
			visible: hasASIOrFeats
		},
		{ id: 'details', label: 'Details', path: 'details' },
		{ id: 'review', label: 'Review', path: 'review' }
	]);

	// Active steps = non-conditional, or conditional + visible
	const activeSteps = $derived(
		allSteps.filter((s) => !s.conditional || s.visible)
	);

	// Determine current step from URL
	const currentPath = $derived($page.url.pathname.split('/').pop() ?? 'class');
	const currentStepIndex = $derived(activeSteps.findIndex((s) => s.path === currentPath));

	// Provide navigation helpers to child pages via context
	function getNextStepPath(currentPath: string): string {
		const idx = activeSteps.findIndex((s) => s.path === currentPath);
		const next = activeSteps[idx + 1];
		return next?.path ?? 'review';
	}

	function getPrevStepPath(currentPath: string): string {
		const idx = activeSteps.findIndex((s) => s.path === currentPath);
		const prev = activeSteps[idx - 1];
		return prev?.path ?? 'class';
	}

	function getNextStepLabel(currentPath: string): string {
		const idx = activeSteps.findIndex((s) => s.path === currentPath);
		const next = activeSteps[idx + 1];
		return next?.label ?? 'Review';
	}

	setContext('wizard-nav', {
		get systemId() { return systemId; },
		getNextStepPath,
		getPrevStepPath,
		getNextStepLabel
	});
</script>

<WizardShell steps={activeSteps} {currentStepIndex} {systemId}>
	{@render children()}
</WizardShell>
