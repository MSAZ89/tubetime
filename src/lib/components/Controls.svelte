<script lang="ts">
	export let newUrl: string;
	export let newTitle: string;
	export let onNewUrlChange: (v: string) => void;
	export let onNewTitleChange: (v: string) => void;
	export let onAdd: () => void;
	export let autoplayPlaylist: boolean;
	export let onToggleAutoplay: (v: boolean) => void;
	export let onReplay: () => void;
	export let onPrev: () => void;
	export let onNext: () => void;
	export let total: number;
	export let onShare: () => void;
</script>

<div class="rounded-lg px-4 text-white">
	<div class="mt-4 mb-4 flex flex-wrap gap-4 sm:mt-0">
		<input
			type="text"
			value={newUrl}
			on:input={(e) => onNewUrlChange((e.target as HTMLInputElement).value)}
			placeholder="YouTube URL..."
			class="flex-2 rounded border border-gray-300 p-2.5"
		/>
		<input
			type="text"
			value={newTitle}
			on:input={(e) => onNewTitleChange((e.target as HTMLInputElement).value)}
			placeholder="Video title..."
			class="flex-1 rounded border border-gray-300 p-2.5"
		/>
	</div>
	<div class="mb-4 flex items-center gap-4">
		<button
			on:click={onAdd}
			class="cursor-pointer rounded bg-blue-700 px-2 py-1 text-sm text-white hover:bg-blue-800"
		>
			Add Video
		</button>
		<button
			on:click={onShare}
			class="cursor-pointer rounded bg-green-700 px-2 py-1 text-sm text-white hover:bg-green-800"
		>
			Share Playlist
		</button>
		<label class="flex items-center gap-2 text-white">
			<input
				type="checkbox"
				checked={autoplayPlaylist}
				on:change={(e) => onToggleAutoplay((e.target as HTMLInputElement).checked)}
				class="rounded"
			/>
			Auto-playlist
			<span class="text-sm text-gray-300"
				>{autoplayPlaylist ? '(ON - Using YT API)' : '(OFF - Using iframe)'}</span
			>
		</label>
	</div>

	<h3 class="mb-4 text-lg font-semibold text-white">Saved Videos ({total})</h3>
	<div class="mb-4 flex gap-2">
		<button
			on:click={onReplay}
			class="bg-white px-3 py-1 text-xs text-black transition-colors hover:cursor-pointer hover:bg-gray-900 hover:text-white"
		>
			Replay
		</button>
		<button
			on:click={onPrev}
			class="bg-white px-3 py-1 text-xs text-black transition-colors hover:cursor-pointer hover:bg-gray-900 hover:text-white"
		>
			Previous
		</button>
		<button
			on:click={onNext}
			class="bg-white px-3 py-1 text-xs text-black transition-colors hover:cursor-pointer hover:bg-gray-900 hover:text-white"
		>
			Next
		</button>
	</div>
</div>
