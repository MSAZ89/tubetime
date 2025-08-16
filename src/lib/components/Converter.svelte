<script lang="ts">
	import { appData, type UrlItem } from '$lib/appData.svelte';

	// Main component state
	let currentEmbed = $state('');
	let newUrl = $state('');
	let newTitle = $state('');
	let editingId = $state<string | null>(null);
	let editUrl = $state('');
	let editTitle = $state('');

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
			const deletedItem = appData.items.find((item) => item.id === id);
			if (deletedItem && currentEmbed === deletedItem.embedUrl) {
				currentEmbed = '';
			}
		}
	}

	function loadVideo(embedUrl: string) {
		// Ensure autoplay and mute
		const url = new URL(embedUrl);
		url.searchParams.set('autoplay', '1');
		url.searchParams.set('mute', '0');
		currentEmbed = url.toString();
	}
</script>

<div class="mx-auto min-h-screen w-full bg-black p-5 font-sans">
	<div class="flex gap-2">
		<!-- Video Player -->
		<div class="w-full">
			{#if currentEmbed}
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
					Click a video title to play it here
				</div>
			{/if}
		</div>
		<!-- URL List -->
		<div class="w-1/2">
			<!-- Add new URL form -->
			<div class="rounded-lg p-6 text-white">
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
				<button
					onclick={handleAdd}
					class="mb-4 cursor-pointer rounded bg-blue-700 px-4 py-2 text-white"
				>
					Add Video
				</button>
				<h3 class="mb-4 text-lg font-semibold text-white">Saved Videos ({appData.items.length})</h3>
				<div class="max-h-[500px] overflow-y-auto rounded border border-gray-300">
					{#each appData.items as item (item.id)}
						<div class="border-b border-gray-200 p-4">
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
										class="cursor-pointer rounded bg-green-600 px-3 py-1.5 text-sm text-white"
									>
										Save
									</button>
									<button
										onclick={handleCancelEdit}
										class="cursor-pointer rounded bg-gray-600 px-3 py-1.5 text-sm text-white"
									>
										Cancel
									</button>
								</div>
							{:else}
								<!-- View mode -->
								<div class="mb-2">
									<button
										onclick={() => loadVideo(item.embedUrl)}
										class="cursor-pointer border-none bg-none p-0 text-left font-medium text-white underline"
									>
										{item.title}
									</button>
								</div>
								<div class="flex gap-2">
									<button
										onclick={() => handleEdit(item)}
										class="cursor-pointer rounded bg-yellow-400 px-2 py-1 text-xs text-black"
									>
										Edit
									</button>
									<button
										onclick={() => handleDelete(item.id)}
										class="cursor-pointer rounded bg-red-600 px-2 py-1 text-xs text-white"
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
