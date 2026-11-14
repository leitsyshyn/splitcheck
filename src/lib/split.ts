import type { Participant, Receipt } from "./types";

export type PersonShare = {
	participantId: string;
	items: { itemId: string; amount: number; sharedWith: number }[];
	itemsTotal: number;
	extras: number;
	discount: number;
	total: number;
};

export type SplitResult = {
	shares: Map<string, PersonShare>;
	unclaimedItemIds: string[];
	unclaimedTotal: number;
	itemsTotal: number;
	grandTotal: number;
};

/**
 * Split `amount` into parts proportional to `weights`, using the largest
 * remainder method so the parts always add up exactly to `amount`.
 */
export function allocate(amount: number, weights: number[]): number[] {
	const sum = weights.reduce((a, b) => a + b, 0);
	if (sum <= 0 || amount === 0) return weights.map(() => 0);
	const raw = weights.map((w) => (amount * w) / sum);
	const floored = raw.map(Math.floor);
	let rest = amount - floored.reduce((a, b) => a + b, 0);
	const order = raw
		.map((r, i) => ({ i, frac: r - Math.floor(r) }))
		.sort((a, b) => b.frac - a.frac || a.i - b.i);
	for (const { i } of order) {
		if (rest <= 0) break;
		floored[i] += 1;
		rest -= 1;
	}
	return floored;
}

/**
 * Who pays for what. Each item is split equally between everyone who claimed
 * it; service/tip and discounts are spread proportionally to each person's
 * item subtotal. All numbers are integer minor units.
 */
export function computeSplit(
	receipt: Receipt,
	participants: Participant[],
): SplitResult {
	const ordered = [...participants].sort(
		(a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id),
	);
	const shares = new Map<string, PersonShare>(
		ordered.map((p) => [
			p.id,
			{
				participantId: p.id,
				items: [],
				itemsTotal: 0,
				extras: 0,
				discount: 0,
				total: 0,
			},
		]),
	);

	const unclaimedItemIds: string[] = [];
	let unclaimedTotal = 0;
	let itemsTotal = 0;

	for (const item of receipt.items) {
		itemsTotal += item.total;
		const claimers = ordered.filter((p) => p.claims.includes(item.id));
		if (claimers.length === 0) {
			unclaimedItemIds.push(item.id);
			unclaimedTotal += item.total;
			continue;
		}
		const parts = allocate(
			item.total,
			claimers.map(() => 1),
		);
		claimers.forEach((p, i) => {
			const share = shares.get(p.id);
			if (!share) return;
			share.items.push({
				itemId: item.id,
				amount: parts[i],
				sharedWith: claimers.length,
			});
			share.itemsTotal += parts[i];
		});
	}

	const people = [...shares.values()];
	const weights = people.map((s) => s.itemsTotal);
	const extras = allocate(receipt.extras, weights);
	const discounts = allocate(receipt.discount, weights);
	people.forEach((s, i) => {
		s.extras = extras[i];
		s.discount = discounts[i];
		s.total = s.itemsTotal + s.extras - s.discount;
	});

	return {
		shares,
		unclaimedItemIds,
		unclaimedTotal,
		itemsTotal,
		grandTotal: itemsTotal + receipt.extras - receipt.discount,
	};
}

export function formatMoney(minor: number, currency: string): string {
	try {
		return new Intl.NumberFormat("uk-UA", {
			style: "currency",
			currency,
			minimumFractionDigits: 2,
		}).format(minor / 100);
	} catch {
		return `${(minor / 100).toFixed(2)} ${currency}`;
	}
}

/** "≈ 1 234,00 грн" at the NBU rate, for receipts in a foreign currency. */
export function formatUah(
	minor: number,
	uahRate: { rate: number } | null,
): string | null {
	return uahRate
		? `≈ ${formatMoney(Math.round(minor * uahRate.rate), "UAH")}`
		: null;
}

/** Receipts print dates in every format; show ISO-ish ones as dd.mm.yyyy hh:mm. */
export function formatReceiptDate(raw: string | null): string | null {
	if (!raw) return null;
	const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(raw);
	if (!m) return raw;
	const [, y, mo, d, h, mi] = m;
	return `${d}.${mo}.${y}${h ? ` ${h}:${mi}` : ""}`;
}

/** "₴", "€", "zł"… for input adornments. */
export function currencySymbol(currency: string): string {
	try {
		return (
			new Intl.NumberFormat("uk-UA", {
				style: "currency",
				currency,
				currencyDisplay: "narrowSymbol",
			})
				.formatToParts(0)
				.find((p) => p.type === "currency")?.value ?? currency
		);
	} catch {
		return currency;
	}
}
