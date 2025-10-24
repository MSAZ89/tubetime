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

// Fetch YouTube video title using oEmbed with CORS proxy
async function fetchYouTubeTitle(url: string): Promise<string> {
	try {
		// Use a CORS proxy to bypass browser restrictions
		const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
		const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(oembedUrl)}`;

		const response = await fetch(proxyUrl);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data = await response.json();
		console.log('Fetched title:', data.title); // Debug log
		return data.title || 'Untitled Video';
	} catch (error) {
		console.warn('Failed to fetch YouTube title:', error);
		console.warn('Error details:', error);
		return 'Untitled Video';
	}
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

	// Modified addItem to automatically fetch YouTube titles
	async function addItem(url: string, title?: string): Promise<boolean> {
		const embedUrl = toEmbedUrl(url);
		if (!embedUrl) return false; // Invalid YouTube URL

		// If no title provided, fetch it from YouTube
		let finalTitle = title;
		if (!finalTitle) {
			finalTitle = await fetchYouTubeTitle(url);
		}

		const newItem: UrlItem = {
			id: crypto.randomUUID(),
			url,
			title: finalTitle || 'Untitled Video',
			embedUrl
		};

		items.push(newItem);
		saveToStorage(items); // Save immediately after change
		return true;
	}

	// Also update the updateItem function to fetch title when URL changes
	async function updateItem(
		id: string,
		updates: Partial<Pick<UrlItem, 'url' | 'title'>>
	): Promise<boolean> {
		const index = items.findIndex((item) => item.id === id);
		if (index === -1) return false;

		const updatedItem = { ...items[index], ...updates };

		if (updates.url) {
			updatedItem.embedUrl = toEmbedUrl(updates.url);
			if (!updatedItem.embedUrl) return false; // Invalid YouTube URL

			// If URL changed but no new title provided, fetch it
			if (!updates.title) {
				updatedItem.title = await fetchYouTubeTitle(updates.url);
			}
		}

		items[index] = updatedItem;
		saveToStorage(items); // Save immediately after change
		return true;
	}

	function randomizeItems() {
		items = items.sort(() => Math.random() - 0.5);
		saveToStorage(items);
	}

	function deleteAllItems() {
		if (
			confirm(
				'Are you sure you want to clear the playlist? Be sure you have bookmarked your playlist!'
			)
		) {
			items = [];
			saveToStorage(items);
			window.location.href = '/'; // Redirect to home after deletion
		}
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

	// Try to extract playlist items from a YouTube playlist URL without using the
	// official Data API. This attempts to use YouTube's Atom/RSS feed for playlists
	// which is available at:
	//   https://www.youtube.com/feeds/videos.xml?playlist_id=PLAYLIST_ID
	// Note: Many browsers block cross-origin requests to youtube.com (CORS). If the
	// fetch fails due to CORS, the caller will receive an empty array and should
	// surface a message to the user explaining they need a server-side proxy.
	async function fetchPlaylistItemsFromUrl(
		playlistUrl: string
	): Promise<Array<{ url: string; title: string }>> {
		// Extract playlist id from common YouTube playlist URL patterns
		// Try to extract a playlist id, channel id, or accept a raw id.
		const listMatch = playlistUrl.match(/[?&]list=([A-Za-z0-9_-]+)/);
		const channelMatch = playlistUrl.match(/\/channel\/([A-Za-z0-9_-]+)/);
		const rawIdMatch = playlistUrl.match(/^([A-Za-z0-9_-]{6,})$/);

		let feedUrl = '';

		if (listMatch) {
			const playlistId = listMatch[1];
			feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
		} else if (channelMatch) {
			const channelId = channelMatch[1];
			feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
		} else if (rawIdMatch) {
			// If the user pasted a raw id (common when copying from some UIs),
			// attempt to treat it as a playlist id first.
			const playlistId = rawIdMatch[1];
			feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;
		} else {
			// not a recognizable playlist/channel identifier
			return [];
		}

		try {
			// Helper: try fetching a URL and return response text or throw
			const tryFetchText = async (u: string) => {
				const r = await fetch(u);
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return await r.text();
			};

			let text: string | null = null;
			// First try direct fetch
			try {
				text = await tryFetchText(feedUrl);
			} catch (err) {
				console.warn('Direct fetch of playlist feed failed (will try proxies):', err);
			}

			// If direct failed, try a couple of public CORS proxies as a fallback.
			if (!text) {
				const proxies = [
					`https://corsproxy.io/?${encodeURIComponent(feedUrl)}`,
					`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`
				];
				for (const proxyUrl of proxies) {
					try {
						text = await tryFetchText(proxyUrl);
						console.log('Fetched playlist feed via proxy:', proxyUrl);
						break;
					} catch (e2) {
						console.warn('Proxy fetch failed for', proxyUrl, e2);
					}
				}
			}

			if (!text) {
				console.warn('Playlist feed fetch failed for direct and proxy attempts');
				return [];
			}
			// Parse XML
			const parser = new DOMParser();
			const doc = parser.parseFromString(text, 'application/xml');
			const entries = Array.from(doc.getElementsByTagName('entry')) as Element[];
			if (!entries.length) {
				// Try RSS 'item' fallback
				const items = Array.from(doc.getElementsByTagName('item')) as Element[];
				return items.map((it) => {
					const linkEl = it.getElementsByTagName('link')[0];
					const titleEl = it.getElementsByTagName('title')[0];
					return {
						url: linkEl ? linkEl.textContent || '' : '',
						title: titleEl ? titleEl.textContent || 'Untitled Video' : 'Untitled Video'
					};
				});
			}

			const results: Array<{ url: string; title: string }> = [];
			for (const entry of entries) {
				// 'link' element often has href attribute
				const linkEl = entry.getElementsByTagName('link')[0];
				let url = '';
				if (linkEl) {
					url = linkEl.getAttribute('href') || linkEl.textContent || '';
				}
				// Fallback: <id> may contain 'yt:video:VIDEOID'
				if (!url) {
					const idEl = entry.getElementsByTagName('id')[0];
					if (idEl && idEl.textContent) {
						const m = idEl.textContent.match(/yt:video:([A-Za-z0-9_-]{11})/);
						if (m) url = `https://www.youtube.com/watch?v=${m[1]}`;
					}
				}
				const titleEl = entry.getElementsByTagName('title')[0];
				const title = titleEl ? titleEl.textContent || 'Untitled Video' : 'Untitled Video';
				if (url) results.push({ url, title });
			}

			return results;
		} catch (err) {
			console.warn('Failed to fetch/parse playlist feed (CORS or network error):', err);
			return [];
		}
	}

	// Adds items from a playlist URL by fetching the feed and replacing current items.
	// Returns the number of items added. If zero, the caller should check for CORS
	// restrictions and offer the user a server-side proxy option.
	async function addItemsFromPlaylistUrl(playlistUrl: string): Promise<number> {
		const payload = await fetchPlaylistItemsFromUrl(playlistUrl);
		if (!payload || !payload.length) return 0;
		setItemsFromPayload(payload);
		return payload.length;
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
		fetchPlaylistItemsFromUrl,
		addItemsFromPlaylistUrl,
		serializeForUrl,
		deleteAllItems,
		randomizeItems
	};
}

export const appData = createAppData();
export type { UrlItem };
