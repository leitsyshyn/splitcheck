import { getRequestHeader } from "@tanstack/react-start/server";

/**
 * Receipt parsing is the only endpoint that costs money (one Gemini call per
 * upload), so it is rate-limited. In-memory sliding windows are enough for a
 * PoC: Cloud Run is capped at a few instances, so the global ceiling is
 * roughly `GLOBAL_PER_HOUR × max-instances`.
 */
const PER_IP = { limit: 8, windowMs: 10 * 60 * 1000 };
const GLOBAL_PER_HOUR = { limit: 120, windowMs: 60 * 60 * 1000 };

const hits = new Map<string, number[]>();

function take(
	key: string,
	{ limit, windowMs }: { limit: number; windowMs: number },
) {
	const now = Date.now();
	const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
	if (recent.length >= limit) {
		hits.set(key, recent);
		return false;
	}
	recent.push(now);
	hits.set(key, recent);
	return true;
}

export class RateLimitError extends Error {
	constructor() {
		super("Забагато чеків за короткий час. Спробуйте за кілька хвилин.");
	}
}

/** Cloud Run puts the real client IP first in X-Forwarded-For. */
function clientIp(): string {
	const forwarded = getRequestHeader("x-forwarded-for");
	return forwarded?.split(",")[0]?.trim() || "unknown";
}

export function assertCanParseReceipt() {
	if (hits.size > 10_000) hits.clear();
	// Per-IP first, so a single abuser doesn't eat the global budget.
	if (!take(`ip:${clientIp()}`, PER_IP) || !take("global", GLOBAL_PER_HOUR)) {
		throw new RateLimitError();
	}
}
