<script lang="ts">
	import { appData, type UrlItem } from '$lib/appData.svelte';

	// Main component state
	let currentEmbed = $state('');
	let currentVideoId = $state<string | null>(null);
	let newUrl = $state('');
	let newTitle = $state('');
	let editingId = $state<string | null>(null);
	let editUrl = $state('');
	let editTitle = $state('');
	let autoplayPlaylist = $state(false);

	// YouTube Player API
	let player: any = null;
	let playerReady = $state(false);
	let apiReady = $state(false);
	let playerContainer: HTMLDivElement | null = null;

	// Load YouTube API
	function loadYouTubeAPI() {
		// Check if API is already loaded
		if ((window as any).YT && (window as any).YT.Player) {
			apiReady = true;
			return;
		}

		// Prevent multiple script loads
		if (document.querySelector('script[src*="iframe_api"]')) {
			return;
		}

		const tag = document.createElement('script');
		tag.src = 'https://www.youtube.com/iframe_api';
		const firstScriptTag = document.getElementsByTagName('script')[0];
		firstScriptTag?.parentNode?.insertBefore(tag, firstScriptTag);

		// YouTube API calls this function when ready
		(window as any).onYouTubeIframeAPIReady = () => {
			apiReady = true;
			console.log('YouTube API ready');
		};
	}

	function extractVideoId(embedUrl: string): string {
		const match = embedUrl.match(/embed\/([A-Za-z0-9_-]{11})/);
		return match ? match[1] : '';
	}

	function onPlayerStateChange(event: any) {
		console.log('Player state changed:', event.data);
		// YT.PlayerState.ENDED = 0
		if (event.data === 0 && autoplayPlaylist) {
			console.log('Video ended, playing next...');
			setTimeout(() => playNextVideo(), 1000);
		}
	}

	function onPlayerReady(event: any) {
		playerReady = true;
		console.log('Player ready');
	}

	function playNextVideo() {
		const currentIndex = appData.items.findIndex((item) => item.id === currentVideoId);
		if (currentIndex === -1) return;

		const nextIndex = (currentIndex + 1) % appData.items.length;
		const nextItem = appData.items[nextIndex];

		if (nextItem) {
			console.log('Playing next video:', nextItem.title);
			loadVideo(nextItem.embedUrl, nextItem.id);
		}
	}

	function playPreviousVideo() {
		const currentIndex = appData.items.findIndex((item) => item.id === currentVideoId);
		if (currentIndex === -1) return;

		const nextIndex = (currentIndex - 1) % appData.items.length;
		const nextItem = appData.items[nextIndex];

		if (nextItem) {
			console.log('Playing previous video:', nextItem.title);
			loadVideo(nextItem.embedUrl, nextItem.id);
		}
	}

	function repeatVideo() {
		// Find current video and replay it
		const currentItem = appData.items.find((item) => item.id === currentVideoId);

		if (currentItem) {
			console.log('Replaying video:', currentItem.title);
			loadVideo(currentItem.embedUrl, currentItem.id);
		}
	}

	function createPlayer(videoId: string) {
		if (!apiReady || !playerContainer) return;

		// Destroy existing player
		if (player) {
			try {
				player.destroy();
			} catch (e) {
				console.log('Error destroying player:', e);
			}
		}

		console.log('Creating player for video:', videoId);

		player = new (window as any).YT.Player(playerContainer, {
			height: '100%',
			width: '100%',
			videoId: videoId,
			playerVars: {
				autoplay: 1,
				mute: 0,
				controls: 1,
				rel: 0,
				modestbranding: 1
			},
			events: {
				onReady: onPlayerReady,
				onStateChange: onPlayerStateChange
			}
		});
	}

	function handleAdd() {
		if (!newUrl.trim()) return;

		const success = appData.addItem(newUrl, newTitle);
		if (success) {
			newUrl = '';
			newTitle = '';
		} else {
			alert('Invalid YouTube URL');
		}
	}

	function handleEdit(item: UrlItem) {
		editingId = item.id;
		editUrl = item.url;
		editTitle = item.title;
	}

	function handleSaveEdit() {
		if (!editingId) return;

		const success = appData.updateItem(editingId, {
			url: editUrl,
			title: editTitle
		});

		if (success) {
			editingId = null;
			editUrl = '';
			editTitle = '';
		} else {
			alert('Invalid YouTube URL');
		}
	}

	function handleCancelEdit() {
		editingId = null;
		editUrl = '';
		editTitle = '';
	}

	function handleDelete(id: string) {
		if (confirm('Are you sure you want to delete this item?')) {
			appData.deleteItem(id);
			// Clear embed if this was the current video
			if (currentVideoId === id) {
				currentEmbed = '';
				currentVideoId = null;
				if (player) {
					player.destroy();
					player = null;
				}
			}
		}
	}

	function loadVideo(embedUrl: string, itemId?: string) {
		const videoId = extractVideoId(embedUrl);
		if (!videoId) return;

		currentVideoId = itemId || appData.items.find((item) => item.embedUrl === embedUrl)?.id || null;

		if (autoplayPlaylist && apiReady) {
			// Use YouTube Player API for autoplay functionality
			currentEmbed = '';
			setTimeout(() => createPlayer(videoId), 100);
		} else {
			// Use iframe for non-autoplay
			const url = new URL(embedUrl);
			url.searchParams.set('autoplay', '1');
			url.searchParams.set('mute', '0');
			currentEmbed = url.toString();

			// Destroy player if it exists
			if (player) {
				player.destroy();
				player = null;
			}
		}
	}

	// Initialize YouTube API on component mount
	$effect(() => {
		loadYouTubeAPI();
	});

	// Handle autoplay toggle - recreate player if needed
	$effect(() => {
		if (currentVideoId && currentEmbed) {
			const currentItem = appData.items.find((item) => item.id === currentVideoId);
			if (currentItem) {
				// Reload current video with new mode
				loadVideo(currentItem.embedUrl, currentItem.id);
			}
		}
	});
</script>

<div class="mx-auto w-full bg-black p-5 font-sans text-gray-300">
	<div class="flex gap-2">
		<!-- Video Player -->
		<div class="w-full">
			{#if autoplayPlaylist && apiReady}
				<!-- YouTube Player API container -->
				<div
					bind:this={playerContainer}
					class="aspect-video w-full rounded-lg bg-black"
					style="height: auto;"
				></div>
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
					class="flex aspect-video items-center justify-center rounded-lg border-2 border-dashed text-white"
				>
					{#if autoplayPlaylist && !apiReady}
						Loading YouTube API...
					{:else}
						Click a video title to play it here
					{/if}
				</div>
			{/if}
		</div>
		<!-- URL List -->
		<div class="w-1/2">
			<!-- Add new URL form -->
			<div class="rounded-lg px-4 text-white">
				<h3 class="mt-0 mb-4 text-lg font-semibold">Add New Video</h3>
				<div class="mb-4 flex gap-4">
					<input
						type="text"
						bind:value={newUrl}
						placeholder="YouTube URL..."
						class="flex-2 rounded border border-gray-300 p-2.5"
					/>
					<input
						type="text"
						bind:value={newTitle}
						placeholder="Video title..."
						class="flex-1 rounded border border-gray-300 p-2.5"
					/>
				</div>
				<div class="mb-4 flex items-center gap-4">
					<button
						onclick={handleAdd}
						class="cursor-pointer rounded bg-blue-700 px-4 py-2 text-white hover:bg-blue-800"
					>
						Add Video
					</button>
					<label class="flex items-center gap-2 text-white">
						<input type="checkbox" bind:checked={autoplayPlaylist} class="rounded" />
						Auto-playlist
						<span class="text-sm text-gray-300">
							{autoplayPlaylist ? '(ON - Using YT API)' : '(OFF - Using iframe)'}
						</span>
					</label>
				</div>
				<h3 class="mb-4 text-lg font-semibold text-white">Saved Videos ({appData.items.length})</h3>
				<button onclick={playNextVideo} class="bg-white px-8 py-1 text-black">{'Next'}</button>
				<button onclick={playPreviousVideo} class="bg-white px-8 py-1 text-black"
					>{'Previous'}</button
				>
				<button onclick={repeatVideo} class="bg-white px-8 py-1 text-black">{'Repeat'}</button>
				<div class="max-h-[500px] overflow-y-auto rounded border border-gray-300">
					{#each appData.items as item (item.id)}
						<div
							class="border-b border-gray-200 p-4 {currentVideoId === item.id ? 'bg-gray-800' : ''}"
						>
							{#if editingId === item.id}
								<!-- Edit mode -->
								<div class="mb-4">
									<input
										bind:value={editTitle}
										placeholder="Title..."
										class="mb-2 w-full rounded border border-gray-300 p-2"
									/>
									<input
										bind:value={editUrl}
										placeholder="URL..."
										class="w-full rounded border border-gray-300 p-2"
									/>
								</div>
								<div class="flex gap-2">
									<button
										onclick={handleSaveEdit}
										class="cursor-pointer rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
									>
										Save
									</button>
									<button
										onclick={handleCancelEdit}
										class="cursor-pointer rounded bg-gray-600 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
									>
										Cancel
									</button>
								</div>
							{:else}
								<!-- View mode -->
								<div class="mb-2">
									<button
										onclick={() => loadVideo(item.embedUrl, item.id)}
										class="cursor-pointer border-none bg-none p-0 text-left font-medium text-white underline hover:text-blue-300 {currentVideoId ===
										item.id
											? 'text-blue-400'
											: ''}"
									>
										{currentVideoId === item.id ? '▶ ' : ''}{item.title}
									</button>
								</div>
								<div class="flex gap-2">
									<button
										onclick={() => handleEdit(item)}
										class="cursor-pointer rounded bg-yellow-400 px-2 py-1 text-xs text-black hover:bg-yellow-500"
									>
										Edit
									</button>
									<button
										onclick={() => handleDelete(item.id)}
										class="cursor-pointer rounded bg-red-600 px-2 py-1 text-xs text-white hover:bg-red-700"
									>
										Delete
									</button>
								</div>
							{/if}
						</div>
					{:else}
						<div class="p-8 text-center text-gray-500">No videos saved yet. Add one above!</div>
					{/each}
				</div>
			</div>
		</div>
	</div>
</div>
