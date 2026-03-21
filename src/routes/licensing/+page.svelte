<script lang="ts">
	import PageHeader from '$lib/components/ui/page-header/PageHeader.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';
	import { Scale, Code, BookOpen, ExternalLink } from 'lucide-svelte';
</script>

<svelte:head>
	<title>Licensing - OpenPentacle</title>
</svelte:head>

<div class="mx-auto max-w-3xl px-4 py-8 animate-fade-in">
	<PageHeader
		as="h1"
		title="Licensing"
		description="OpenPentacle is open-source software with content from multiple open-license game systems."
	/>

	<div class="mt-8 space-y-8">
		<!-- Software License -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<Code class="size-5 text-primary" />
					<Card.Title>Application Code</Card.Title>
				</div>
			</Card.Header>
			<Card.Content class="space-y-3">
				<div class="flex items-center gap-2">
					<Badge>GPL-3.0</Badge>
					<span class="text-sm text-muted-foreground">GNU General Public License v3.0</span>
				</div>
				<p class="text-sm text-muted-foreground">
					All application source code &mdash; the SvelteKit frontend, engine functions,
					API routes, components, styles, tests, and build configuration &mdash; is licensed
					under the GNU General Public License v3.0.
				</p>
				<p class="text-sm text-muted-foreground">
					This means you are free to use, modify, and distribute this software, provided
					that any derivative works are also distributed under the GPL-3.0 or a compatible
					license. The full license text is included in the
					<code class="rounded bg-muted px-1.5 py-0.5 text-xs">LICENSE</code> file in the project root.
				</p>
			</Card.Content>
		</Card.Root>

		<Separator />

		<!-- Content Licenses -->
		<div>
			<div class="flex items-center gap-2">
				<BookOpen class="size-5 text-primary" />
				<h2 class="text-lg font-semibold">Game Content</h2>
			</div>
			<p class="mt-2 text-sm text-muted-foreground">
				Game content (classes, species, spells, equipment, and other game rules) is loaded
				from content packs. Each content pack is distributed under the license specified
				by its original publisher. The application code does not contain any game rules &mdash;
				all mechanics come from these content packs.
			</p>
		</div>

		<div class="space-y-4">
			<!-- SRD 5.2.1 -->
			<Card.Root>
				<Card.Header class="pb-2">
					<div class="flex items-center justify-between">
						<Card.Title class="text-base">D&D 5e SRD 5.2.1</Card.Title>
						<Badge variant="outline">CC-BY-4.0</Badge>
					</div>
				</Card.Header>
				<Card.Content class="space-y-2">
					<p class="text-sm text-muted-foreground">
						The Systems Reference Document 5.2.1 is published by Wizards of the Coast
						under the Creative Commons Attribution 4.0 International License (CC-BY-4.0).
					</p>
					<p class="text-sm text-muted-foreground">
						You are free to share and adapt this content for any purpose, including
						commercially, as long as you give appropriate credit to Wizards of the Coast.
					</p>
					<a
						href="https://creativecommons.org/licenses/by/4.0/"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
					>
						CC-BY-4.0 License
						<ExternalLink class="size-3" />
					</a>
					<a
						href="https://www.dndbeyond.com/srd"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
					>
						SRD 5.2.1 on D&D Beyond
						<ExternalLink class="size-3" />
					</a>
				</Card.Content>
			</Card.Root>

			<!-- Black Flag -->
			<Card.Root class="opacity-60">
				<Card.Header class="pb-2">
					<div class="flex items-center justify-between">
						<Card.Title class="text-base">Black Flag Roleplaying</Card.Title>
						<div class="flex items-center gap-2">
							<Badge variant="outline">ORC</Badge>
							<Badge variant="outline">Coming Soon</Badge>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">
						Black Flag Roleplaying content by Kobold Press is published under the
						Open RPG Creative License (ORC). When this content pack is added, it
						will be distributed under the terms of the ORC License.
					</p>
					<a
						href="https://koboldpress.com/black-flag-roleplaying/"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
					>
						Black Flag Roleplaying by Kobold Press
						<ExternalLink class="size-3" />
					</a>
				</Card.Content>
			</Card.Root>

			<!-- A5E -->
			<Card.Root class="opacity-60">
				<Card.Header class="pb-2">
					<div class="flex items-center justify-between">
						<Card.Title class="text-base">Advanced 5th Edition (A5E)</Card.Title>
						<div class="flex items-center gap-2">
							<Badge variant="outline">Creative Commons</Badge>
							<Badge variant="outline">Coming Soon</Badge>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">
						Level Up: Advanced 5th Edition content by EN Publishing is published
						under a Creative Commons license. When this content pack is added, it
						will be distributed under its original license terms.
					</p>
					<a
						href="https://www.levelup5e.com/"
						target="_blank"
						rel="noopener noreferrer"
						class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
					>
						Level Up: Advanced 5th Edition
						<ExternalLink class="size-3" />
					</a>
				</Card.Content>
			</Card.Root>

			<!-- Homebrew -->
			<Card.Root>
				<Card.Header class="pb-2">
					<Card.Title class="text-base">Homebrew Content Packs</Card.Title>
				</Card.Header>
				<Card.Content>
					<p class="text-sm text-muted-foreground">
						User-created homebrew content packs are the intellectual property of
						their creators. The OpenPentacle application provides the tools to create,
						validate, and use homebrew packs, but does not claim any rights over
						user-generated content.
					</p>
				</Card.Content>
			</Card.Root>
		</div>

		<Separator />

		<!-- Summary -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-2">
					<Scale class="size-5 text-primary" />
					<Card.Title>In Summary</Card.Title>
				</div>
			</Card.Header>
			<Card.Content>
				<ul class="space-y-2 text-sm text-muted-foreground">
					<li><strong class="text-foreground">Application code</strong> &mdash; GPL-3.0. Fork it, modify it, contribute back.</li>
					<li><strong class="text-foreground">Game content</strong> &mdash; Each content pack carries the license from its original publisher (CC-BY-4.0, ORC, etc.).</li>
					<li><strong class="text-foreground">Homebrew content</strong> &mdash; Belongs to its creator.</li>
					<li><strong class="text-foreground">Your characters</strong> &mdash; Are yours. Export, share, or delete them at any time.</li>
				</ul>
			</Card.Content>
		</Card.Root>
	</div>
</div>
