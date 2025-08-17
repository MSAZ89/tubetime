<script lang="ts">
	import { appData, type UrlItem } from '$lib/appData.svelte';
	import { onMount } from 'svelte';

	import Player from './Player.svelte';
	import Controls from './Controls.svelte';
	import VideoList from './VideoList.svelte';
	// Main component state
	let currentEmbed = $state('');
	let currentVideoId = $state<string | null>(null);
	let newUrl = $state('');
	let newTitle = $state('');
	let editingId = $state<string | null>(null);
	let editUrl = $state('');
	let editTitle = $state('');
	let autoplayPlaylist = $state(true);

	// YouTube Player API
	let player: any = null;
	let playerReady = $state(false);
	let apiReady = $state(false);
	let playerContainer: HTMLDivElement | null = $state(null);

	// Load YouTube API
	function loadYouTubeAPI() {
		// This function requires DOM; guard for SSR
		if (typeof window === 'undefined' || typeof document === 'undefined') return;

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
		console.log('repeatVideo called');

		if (!currentVideoId) {
			console.log('No current video to repeat');
			return;
		}

		const currentItem = appData.items.find((item) => item.id === currentVideoId);

		if (currentItem) {
			console.log('Replaying video:', currentItem.title);
			loadVideo(currentItem.embedUrl, currentItem.id, false); // Don't force reload, just restart
		} else {
			console.log('Could not find current item');
		}
	}

	function repeatVideoDirect() {
		console.log('repeatVideoDirect called');

		if (autoplayPlaylist && player) {
			// YouTube API method - this works great
			try {
				console.log('Using YouTube API seekTo(0)');
				player.seekTo(0);
				player.playVideo();
			} catch (e) {
				console.error('YouTube API error:', e);
			}
		} else if (currentEmbed) {
			// iframe method - force complete reload by clearing and resetting
			console.log('Force reloading iframe');
			const originalEmbed = currentEmbed;

			// Clear the iframe first
			// The following code was incorrectly placed inside a TypeScript function and caused a compile error.
			// If you need to render this HTML, move it to the markup section of your Svelte file.
			// Otherwise, remove it from the function body.
			currentEmbed = '';

			// Then reload it after a brief delay
			setTimeout(() => {
				const url = new URL(originalEmbed);
				// Add a random parameter to force fresh load
				url.searchParams.set('v', Date.now().toString());
				url.searchParams.set('autoplay', '1');
				url.searchParams.set('t', '0');
				currentEmbed = url.toString();
			}, 100);
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

	function loadVideo(embedUrl: string, itemId?: string, forceReload = false) {
		const videoId = extractVideoId(embedUrl);
		if (!videoId) return;

		const newVideoId =
			itemId || appData.items.find((item) => item.embedUrl === embedUrl)?.id || null;
		const isSameVideo = currentVideoId === newVideoId;

		currentVideoId = newVideoId;

		if (autoplayPlaylist && apiReady) {
			// Use YouTube Player API for autoplay functionality
			currentEmbed = '';

			if (isSameVideo && player && !forceReload) {
				// Same video - just restart it
				console.log('Restarting current video via API');
				try {
					player.seekTo(0);
					player.playVideo();
				} catch (e) {
					console.error('Error restarting video:', e);
					// Fallback: recreate player
					setTimeout(() => createPlayer(videoId), 100);
				}
			} else {
				// Different video or forced reload - create new player
				setTimeout(() => createPlayer(videoId), 100);
			}
		} else {
			// Use iframe for non-autoplay
			const url = new URL(embedUrl);
			url.searchParams.set('autoplay', '1');
			url.searchParams.set('mute', '0');

			if (isSameVideo && !forceReload) {
				// Same video - add timestamp to force restart
				url.searchParams.set('t', '0');
				// Force iframe refresh by changing src
				setTimeout(() => {
					currentEmbed = url.toString();
				}, 50);
			} else {
				currentEmbed = url.toString();
			}

			// Destroy player if it exists
			if (player) {
				player.destroy();
				player = null;
			}
		}
	}

	// Initialize YouTube API and load shared playlist (client-only)
	onMount(() => {
		loadYouTubeAPI();

		// On first load, check for playlist param (guard for SSR)
		if (typeof window === 'undefined') return;
		try {
			const params = new URLSearchParams(window.location.search);
			const pl = params.get('pl');
			if (!pl) return;

			// The token is encodeURIComponent(btoa(unescape(encodeURIComponent(json))))
			// Reverse steps: percent-decode (maybe twice), atob, then decodeURIComponent(escape(...))
			let b64 = pl;
			try {
				b64 = decodeURIComponent(b64);
				// handle accidental double-encoding
				const maybe = decodeURIComponent(b64);
				if (maybe !== b64) b64 = maybe;
			} catch (e) {
				// ignore decode errors and continue with original
			}
			const raw = typeof atob !== 'undefined' ? atob(b64) : b64;
			let json = raw;
			try {
				json =
					typeof escape !== 'undefined' ? decodeURIComponent(escape(raw)) : decodeURIComponent(raw);
			} catch (e) {
				// fallback: try direct decode
				try {
					json = decodeURIComponent(raw);
				} catch (e2) {
					json = raw;
				}
			}
			const payload = JSON.parse(json) as Array<{ url: string; title?: string }>;
			if (payload && payload.length) {
				appData.setItemsFromPayload(payload);
			}
		} catch (e) {
			console.error('Failed to parse playlist param', e);
		}
	});

	function generateShareUrl() {
		const token = appData.serializeForUrl();
		if (!token) return alert('Could not generate share URL');

		if (typeof window === 'undefined') return alert('Cannot generate URL in this environment');
		const url = new URL(window.location.href);
		url.searchParams.set('pl', token);

		// Copy to clipboard first
		if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard
				.writeText(url.toString())
				.then(() => {
					alert(
						'Share URL copied to clipboard. Be sure to bookmark this page to save your playlist!'
					);
					// Navigate to the new URL
					window.location.href = url.toString();
				})
				.catch((e) => {
					console.error('Clipboard error', e);
					prompt('Copy this URL', url.toString());
					window.location.href = url.toString();
				});
		} else {
			prompt('Copy this URL', url.toString());
			window.location.href = url.toString();
		}
	}

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
	<div class="gap-2 sm:flex">
		<!-- Video Player -->
		<Player
			{autoplayPlaylist}
			{apiReady}
			{currentEmbed}
			setContainer={(el) => (playerContainer = el)}
		/>

		<!-- URL List / Controls -->
		<div class="sm:w-1/2">
			<Controls
				{newUrl}
				{newTitle}
				onNewUrlChange={(v) => (newUrl = v)}
				onNewTitleChange={(v) => (newTitle = v)}
				onAdd={handleAdd}
				{autoplayPlaylist}
				onToggleAutoplay={(v) => (autoplayPlaylist = v)}
				onReplay={repeatVideoDirect}
				onPrev={playPreviousVideo}
				onNext={playNextVideo}
				total={appData.items.length}
				onShare={generateShareUrl}
			/>

			<div class="rounded-lg px-4 text-white">
				<VideoList
					items={appData.items}
					{currentVideoId}
					{editingId}
					{editUrl}
					{editTitle}
					onReorder={(from, to) => appData.reorderItems(from, to)}
					onLoadVideo={(u, id) => loadVideo(u, id)}
					onEdit={(item) => handleEdit(item)}
					onDelete={(id) => handleDelete(id)}
					onSaveEdit={handleSaveEdit}
					onCancelEdit={handleCancelEdit}
					onChangeEditUrl={(v) => (editUrl = v)}
					onChangeEditTitle={(v) => (editTitle = v)}
				/>
			</div>
		</div>
	</div>
</div>
