<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import type { Snippet } from 'svelte';

	type Props = {
		title: string;
		children: Snippet;
		class?: string;
	};

	let { title, children, class: className }: Props = $props();
</script>

<Card.Root class="animate-slide-up {className ?? ''}">
	<Card.Header>
		<Card.Title class="text-lg">{title}</Card.Title>
	</Card.Header>
	<Card.Content>
		{@render children()}
	</Card.Content>
</Card.Root>
