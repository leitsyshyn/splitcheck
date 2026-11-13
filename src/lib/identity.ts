import { useCallback, useSyncExternalStore } from "react";

/** Who am I in a given room. Lives only in this browser's localStorage. */
export type Identity = { participantId: string; hostToken?: string };

const key = (roomId: string) => `splitcheck:room:${roomId}`;
const listeners = new Set<() => void>();
const cache = new Map<string, { raw: string | null; value: Identity | null }>();

function read(roomId: string): Identity | null {
	let raw: string | null = null;
	try {
		raw = localStorage.getItem(key(roomId));
	} catch {
		return null;
	}
	const cached = cache.get(roomId);
	if (cached && cached.raw === raw) return cached.value;
	let value: Identity | null = null;
	try {
		value = raw ? (JSON.parse(raw) as Identity) : null;
	} catch {}
	cache.set(roomId, { raw, value });
	return value;
}

export function saveIdentity(roomId: string, identity: Identity) {
	try {
		localStorage.setItem(key(roomId), JSON.stringify(identity));
	} catch {}
	for (const l of listeners) l();
}

function subscribe(listener: () => void) {
	listeners.add(listener);
	window.addEventListener("storage", listener);
	return () => {
		listeners.delete(listener);
		window.removeEventListener("storage", listener);
	};
}

/** `undefined` while rendering on the server / before hydration. */
export function useIdentity(roomId: string): Identity | null | undefined {
	const getSnapshot = useCallback(() => read(roomId), [roomId]);
	return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

const NAME_KEY = "splitcheck:name";

/** Last name the user typed, so they don't retype it in every room. */
export function getSavedName(): string {
	try {
		return localStorage.getItem(NAME_KEY) ?? "";
	} catch {
		return "";
	}
}

export function saveName(name: string) {
	try {
		localStorage.setItem(NAME_KEY, name.trim());
	} catch {}
}
