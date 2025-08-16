<script lang="ts">
	import { ScrollArea } from 'bits-ui';
	import type { UrlItem } from '$lib/appData.svelte';

	export let items: UrlItem[] = [];
	export let currentVideoId: string | null;
	export let editingId: string | null;
	export let editUrl: string;
	export let editTitle: string;

	export let onLoadVideo: (embedUrl: string, id?: string) => void;
	export let onEdit: (item: UrlItem) => void;
	export let onDelete: (id: string) => void;
	export let onSaveEdit: () => void;
	export let onCancelEdit: () => void;
	export let onChangeEditUrl: (v: string) => void;
	export let onChangeEditTitle: (v: string) => void;
</script>

<ScrollArea.Root
	class="relative h-[500px] w-full overflow-hidden rounded-[10px] border border-dark-10 shadow-card"
>
	<ScrollArea.Viewport class="h-full w-full  py-4">
		{#if items.length > 0}
			{#each items as item (item.id)}
				<div class="border-b border-gray-200 p-4 {currentVideoId === item.id ? 'bg-gray-800' : ''}">
					{#if editingId === item.id}
						<!-- Edit mode -->
						<div class="mb-4">
							<input
								value={editTitle}
								on:input={(e) => onChangeEditTitle((e.target as HTMLInputElement).value)}
								placeholder="Title..."
								class="mb-2 w-full rounded border border-gray-300 p-2"
							/>
							<input
								value={editUrl}
								on:input={(e) => onChangeEditUrl((e.target as HTMLInputElement).value)}
								placeholder="URL..."
								class="w-full rounded border border-gray-300 p-2"
							/>
						</div>
						<div class="flex gap-2">
							<button
								on:click={onSaveEdit}
								class="cursor-pointer rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
								>Save</button
							>
							<button
								on:click={onCancelEdit}
								class="cursor-pointer rounded bg-gray-600 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
								>Cancel</button
							>
						</div>
					{:else}
						<!-- View mode -->
						<div class="mb-2">
							<button
								on:click={() => onLoadVideo(item.embedUrl, item.id)}
								class="cursor-pointer border-none bg-none p-0 text-left font-medium text-white underline hover:text-blue-300 {currentVideoId ===
								item.id
									? 'text-blue-400'
									: ''}"
							>
								{currentVideoId === item.id ? '▶ ' : ''}{item.title}
							</button>
						</div>
						<div class="flex gap-2">
							<button on:click={() => onEdit(item)} class="cursor-pointer text-xs text-blue-400"
								>Edit</button
							>
							<button on:click={() => onDelete(item.id)} class="cursor-pointer text-xs text-red-800"
								>Delete</button
							>
						</div>
					{/if}
				</div>
			{/each}
		{:else}
			<div class="p-8 text-center text-gray-500">No videos saved yet. Add one above!</div>
		{/if}
	</ScrollArea.Viewport>
	<ScrollArea.Scrollbar
		orientation="vertical"
		class="data-[state=visible]:animate-in data-[state=hidden]:animate-out data-[state=hidden]:fade-out-0 data-[state=visible]:fade-in-0 flex w-2.5 touch-none rounded-full border-l border-l-transparent bg-muted p-px transition-all duration-200 select-none hover:w-3 hover:bg-dark-10"
	>
		<ScrollArea.Thumb class="flex-1 rounded-full bg-muted-foreground" />
	</ScrollArea.Scrollbar>
	<ScrollArea.Corner />
</ScrollArea.Root>
