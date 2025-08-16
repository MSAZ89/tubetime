<script lang="ts">
	import { onDestroy } from 'svelte';
	import { appData } from '$lib/appData.svelte';
	let { autoplayPlaylist, apiReady, currentEmbed, setContainer } = $props<{
		autoplayPlaylist: boolean;
		apiReady: boolean;
		currentEmbed: string;
		setContainer: (el: HTMLDivElement | null) => void;
	}>();

	let container: HTMLDivElement | null = $state(null);

	// Forward the inner container element to the parent so it can create the YT player there
	$effect(() => {
		if (setContainer) setContainer(container);
	});

	onDestroy(() => setContainer && setContainer(null));
</script>

<div class="min-h-[180px] w-full">
	{#if autoplayPlaylist && apiReady}
		<!-- YouTube Player API container -->
		<div
			bind:this={container}
			class="flex aspect-video w-full items-center justify-center rounded-lg border-2 border-dashed border-gray-600 bg-black text-white"
			style="height: auto;"
		>
			{#if appData.items.length > 0}
				Click a video title to play it here
			{:else}
				Add a video to the playlist to play it here
			{/if}
		</div>
	{:else if currentEmbed}
		<!-- Regular iframe -->
		<iframe
			width="100%"
			height="100%"
			src={currentEmbed}
			title="YouTube video player"
			frameborder="0"
			allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
			referrerpolicy="strict-origin-when-cross-origin"
			allowfullscreen
			class="aspect-video rounded-lg"
		></iframe>
	{:else}
		<div
			class="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed border-gray-600 text-white"
			style="min-height: 180px;"
		>
			{#if appData.items.length > 0}
				Click a video title to play it here
			{:else}
				Add a video to the playlist to play it here
			{/if}
		</div>
	{/if}
</div>
