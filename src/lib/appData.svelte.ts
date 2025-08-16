// lib/appData.svelte.ts
interface UrlItem {
	id: string;
	url: string;
	title: string;
	embedUrl: string;
}

function toEmbedUrl(url: string): string {
	if (!url.trim()) return '';

	// Handle various YouTube URL formats
	let videoId = '';

	// Try different patterns in order of complexity
	const patterns = [
		// Standard watch URLs with v parameter (most common)
		/(?:youtube\.com\/watch\?.*[?&]v=|youtube\.com\/watch\?v=)([A-Za-z0-9_-]{11})/,
		// Short URLs (youtu.be)
		/youtu\.be\/([A-Za-z0-9_-]{11})/,
		// Embed URLs
		/youtube\.com\/embed\/([A-Za-z0-9_-]{11})/,
		// Shorts URLs
		/youtube\.com\/shorts\/([A-Za-z0-9_-]{11})/,
		// Live URLs
		/youtube\.com\/live\/([A-Za-z0-9_-]{11})/,
		// Direct /v/ URLs
		/youtube\.com\/v\/([A-Za-z0-9_-]{11})/,
		// Mobile URLs
		/m\.youtube\.com\/watch\?.*[?&]v=([A-Za-z0-9_-]{11})/,
		// URLs without watch (edge case)
		/youtube\.com\/watch\/([A-Za-z0-9_-]{11})/,
		// Attribution links (encoded)
		/youtube\.com\/attribution_link\?.*[?&]u=.*watch(?:%3Fv%3D|%3Fv%3D)([A-Za-z0-9_-]{11})/,
		// YouTube nocookie domain
		/youtube-nocookie\.com\/embed\/([A-Za-z0-9_-]{11})/
	];

	// Try each pattern
	for (const pattern of patterns) {
		const match = url.match(pattern);
		if (match && match[1]) {
			videoId = match[1];
			break;
		}
	}

	// Return embed URL if we found a video ID
	return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
}

function createAppData() {
	const STORAGE_KEY = 'youtube-urls';

	// Load initial data from localStorage
	function loadFromStorage(): UrlItem[] {
		if (typeof localStorage === 'undefined') return [];
		try {
			const savedData = localStorage.getItem(STORAGE_KEY);
			return savedData ? JSON.parse(savedData) : [];
		} catch (error) {
			console.error('Error loading from localStorage:', error);
			return [];
		}
	}

	// Save data to localStorage
	function saveToStorage(data: UrlItem[]) {
		if (typeof localStorage === 'undefined') return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
		} catch (error) {
			console.error('Error saving to localStorage:', error);
		}
	}

	let items = $state<UrlItem[]>(loadFromStorage());

	function addItem(url: string, title: string): boolean {
		const embedUrl = toEmbedUrl(url);
		if (!embedUrl) return false; // Invalid YouTube URL

		const newItem: UrlItem = {
			id: crypto.randomUUID(),
			url,
			title: title || 'Untitled Video',
			embedUrl
		};

		items.push(newItem);
		saveToStorage(items); // Save immediately after change
		return true;
	}

	function updateItem(id: string, updates: Partial<Pick<UrlItem, 'url' | 'title'>>): boolean {
		const index = items.findIndex((item) => item.id === id);
		if (index === -1) return false;

		const updatedItem = { ...items[index], ...updates };
		if (updates.url) {
			updatedItem.embedUrl = toEmbedUrl(updates.url);
			if (!updatedItem.embedUrl) return false; // Invalid YouTube URL
		}

		items[index] = updatedItem;
		saveToStorage(items); // Save immediately after change
		return true;
	}

	function deleteItem(id: string): boolean {
		const index = items.findIndex((item) => item.id === id);
		if (index === -1) return false;

		items.splice(index, 1);
		saveToStorage(items); // Save immediately after change
		return true;
	}

	function reorderItems(fromIndex: number, toIndex: number): boolean {
		if (fromIndex < 0 || toIndex < 0 || fromIndex >= items.length || toIndex >= items.length) {
			return false;
		}

		const [moved] = items.splice(fromIndex, 1);
		items.splice(toIndex, 0, moved);
		saveToStorage(items);
		return true;
	}

	// Set items from a raw payload (array of {url, title}). This will replace current items and persist.
	function setItemsFromPayload(payload: Array<{ url: string; title?: string }>) {
		const newItems: UrlItem[] = [];
		for (const p of payload) {
			const embedUrl = toEmbedUrl(p.url);
			if (!embedUrl) continue; // skip invalid
			newItems.push({
				id: crypto.randomUUID(),
				url: p.url,
				title: p.title || 'Untitled Video',
				embedUrl
			});
		}

		// Replace contents of the existing reactive items array
		items.splice(0, items.length, ...newItems);
		saveToStorage(items);
	}

	// Serialize minimal playlist (url + title) to a base64 query-safe string
	function serializeForUrl(): string {
		try {
			const payload = items.map((i) => ({ url: i.url, title: i.title }));
			const json = JSON.stringify(payload);
			// base64 encode unicode-safe
			const b64 = btoa(unescape(encodeURIComponent(json)));
			return encodeURIComponent(b64);
		} catch (e) {
			console.error('serializeForUrl error', e);
			return '';
		}
	}

	return {
		get items() {
			return items;
		},
		addItem,
		updateItem,
		deleteItem,
		reorderItems,
		setItemsFromPayload,
		serializeForUrl
	};
}

export const appData = createAppData();
export type { UrlItem };
