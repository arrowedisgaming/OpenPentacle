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
			<span>Open source &middot; GPL-3.0</span>
		</div>
	</div>
</footer>
