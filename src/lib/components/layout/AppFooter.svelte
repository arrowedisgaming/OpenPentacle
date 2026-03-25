<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
</script>

<footer class="border-t border-border">
	<div class="mx-auto flex max-w-5xl flex-col items-center gap-2 px-4 py-6 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
		<p>&copy; {new Date().getFullYear()} OpenPentacle</p>
		<div class="flex items-center gap-4">
			<a href="/content-packs" class="hover:text-foreground">Content Packs</a>
			<Separator orientation="vertical" class="h-4" />
			<a href="/licensing" class="hover:text-foreground">Licensing</a>
			<Separator orientation="vertical" class="h-4" />
			<a href="https://github.com/arrowedisgaming/OpenPentacle/blob/main/CHANGELOG.md#{__APP_CHANGELOG_ANCHOR__}" target="_blank" rel="noopener noreferrer" class="hover:text-foreground">v{__APP_VERSION__}</a>
			<Separator orientation="vertical" class="h-4" />
			<a href="https://github.com/arrowedisgaming/OpenPentacle" target="_blank" rel="noopener noreferrer" class="hover:text-foreground">Open source</a> &middot; GPL-3.0
		</div>
	</div>
</footer>
