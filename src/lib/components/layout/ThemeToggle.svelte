<script lang="ts">
	import { theme } from '$lib/stores/theme';
	import { themes, systemOption, type ThemeId } from '$lib/themes/registry';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Button } from '$lib/components/ui/button';

	const allOptions = [...themes, systemOption];

	let CurrentIcon = $derived(
		allOptions.find((o) => o.id === $theme)?.icon ?? systemOption.icon
	);
</script>

<DropdownMenu.Root>
	<DropdownMenu.Trigger>
		{#snippet child({ props })}
			<Button variant="ghost" size="icon-sm" {...props}>
				<CurrentIcon class="size-4" />
				<span class="sr-only">Toggle theme</span>
			</Button>
		{/snippet}
	</DropdownMenu.Trigger>
	<DropdownMenu.Content align="end">
		{#each allOptions as opt}
			{@const Icon = opt.icon}
			<DropdownMenu.Item onclick={() => theme.set(opt.id as ThemeId)}>
				<Icon class="mr-2 size-4" />
				{opt.label}
			</DropdownMenu.Item>
		{/each}
	</DropdownMenu.Content>
</DropdownMenu.Root>
