<script lang="ts">
	import { ScrollArea } from 'bits-ui';
	import type { UrlItem } from '$lib/appData.svelte';

	const {
		items = [],
		currentVideoId,
		editingId,
		editUrl,
		editTitle,
		onLoadVideo,
		onEdit,
		onDelete,
		onSaveEdit,
		onCancelEdit,
		onChangeEditUrl,
		onChangeEditTitle,
		onReorder
	} = $props<{
		items?: UrlItem[];
		currentVideoId?: string | null;
		editingId?: string | null;
		editUrl?: string;
		editTitle?: string;
		onLoadVideo?: (embedUrl: string, id?: string) => void;
		onEdit?: (item: UrlItem) => void;
		onDelete?: (id: string) => void;
		onSaveEdit?: () => void;
		onCancelEdit?: () => void;
		onChangeEditUrl?: (v: string) => void;
		onChangeEditTitle?: (v: string) => void;
		onReorder?: (from: number, to: number) => void;
	}>();

	let draggedIndex: number | null = $state(null);
	let dragOverIndex: number | null = $state(null);
</script>

<ScrollArea.Root
	class="relative h-[500px] w-full overflow-hidden rounded-[10px] border border-dark-10 shadow-card"
>
	<ScrollArea.Viewport class="h-full w-full py-2">
		{#if items.length > 0}
			{#each items as item, index (item.id)}
				<div
					role="listitem"
					class="relative border-b border-gray-200 p-2 transition-all duration-200
						{currentVideoId === item.id ? 'bg-gray-800' : ''}
						{draggedIndex === index ? 'scale-95 border-blue-400 bg-blue-200 shadow-lg' : ''}
						{dragOverIndex === index && draggedIndex !== index
						? 'border-dashed border-blue-300 bg-blue-500'
						: ''}
					"
					draggable="true"
					ondragstart={(e) => {
						draggedIndex = index;
						e.dataTransfer?.setData('text/plain', String(index));
						e.dataTransfer?.setData('application/x-item-id', item.id);
						e.dataTransfer!.effectAllowed = 'move';
						// Add ghost image styling
						if (e.target instanceof HTMLElement) {
							e.target.style.cursor = 'grabbing';
						}
					}}
					ondragend={(e) => {
						draggedIndex = null;
						dragOverIndex = null;
						if (e.target instanceof HTMLElement) {
							e.target.style.cursor = '';
						}
					}}
					ondragenter={(e) => {
						e.preventDefault();
						if (draggedIndex !== null && draggedIndex !== index) {
							dragOverIndex = index;
						}
					}}
					ondragleave={(e) => {
						// Only clear if we're leaving this element (not entering a child)
						if (!e.currentTarget.contains(e.relatedTarget as Node)) {
							dragOverIndex = null;
						}
					}}
					ondragover={(e) => {
						e.preventDefault();
						e.dataTransfer!.dropEffect = 'move';
						if (draggedIndex !== null && draggedIndex !== index) {
							dragOverIndex = index;
						}
					}}
					ondrop={(e) => {
						e.preventDefault();
						const from = Number(e.dataTransfer?.getData('text/plain'));
						const to = index;
						if (!Number.isNaN(from) && from !== to) {
							onReorder && onReorder(from, to);
						}
						draggedIndex = null;
						dragOverIndex = null;
					}}
				>
					<!-- Drag handle indicator -->
					<div
						class="absolute top-1/2 left-1 -translate-y-1/2 cursor-grab text-gray-400 hover:text-gray-600 active:cursor-grabbing"
					>
						<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
							<circle cx="9" cy="5" r="1" />
							<circle cx="15" cy="5" r="1" />
							<circle cx="9" cy="12" r="1" />
							<circle cx="15" cy="12" r="1" />
							<circle cx="9" cy="19" r="1" />
							<circle cx="15" cy="19" r="1" />
						</svg>
					</div>

					<!-- Drop zone indicators -->
					{#if dragOverIndex === index && draggedIndex !== null && draggedIndex !== index}
						<div
							class="absolute right-0 left-0 {draggedIndex < index
								? 'bottom-0'
								: 'top-0'} h-0.5 animate-pulse bg-blue-400"
						></div>
					{/if}

					<div class="ml-6">
						{#if editingId === item.id}
							<!-- Edit mode -->
							<div class="mb-4">
								<input
									value={editTitle}
									oninput={(e) => onChangeEditTitle((e.target as HTMLInputElement).value)}
									placeholder="Title..."
									class="mb-2 w-full rounded border border-gray-300 p-2"
								/>
								<input
									value={editUrl}
									oninput={(e) => onChangeEditUrl((e.target as HTMLInputElement).value)}
									placeholder="URL..."
									class="w-full rounded border border-gray-300 p-2"
								/>
							</div>
							<div class="flex gap-2">
								<button
									onclick={onSaveEdit}
									class="cursor-pointer rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
									>Save</button
								>
								<button
									onclick={onCancelEdit}
									class="cursor-pointer rounded bg-gray-600 px-3 py-1.5 text-sm text-white hover:bg-gray-700"
									>Cancel</button
								>
							</div>
						{:else}
							<!-- View mode -->
							<div class="mb-2">
								<title>Cleantube | {item.title}</title>
								<button
									onclick={() => onLoadVideo(item.embedUrl, item.id)}
									class="cursor-pointer border-none bg-none p-0 text-left font-medium text-white underline hover:text-blue-300 {currentVideoId ===
									item.id
										? 'text-blue-400'
										: ''}"
								>
									{currentVideoId === item.id ? '▶ ' : ''}{item.title}
								</button>
							</div>
							<div class="flex gap-2">
								<button onclick={() => onEdit(item)} class="cursor-pointer text-xs text-blue-400"
									>Edit</button
								>
								<button
									onclick={() => onDelete(item.id)}
									class="cursor-pointer text-xs text-red-800">Delete</button
								>
							</div>
						{/if}
					</div>
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
