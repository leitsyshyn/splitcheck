import { describe, expect, it } from "vitest";
import { allocate, computeSplit, formatReceiptDate } from "./split";
import type { Participant, Receipt } from "./types";

const person = (id: string, claims: string[], joinedAt = 0): Participant => ({
	id,
	name: id,
	color: "#000",
	claims,
	joinedAt,
});

const receipt = (overrides: Partial<Receipt> = {}): Receipt => ({
	merchant: null,
	date: null,
	currency: "UAH",
	items: [
		{ id: "pizza", name: "Pizza", quantity: 1, total: 30000, box: null },
		{ id: "beer", name: "Beer", quantity: 2, total: 16000, box: null },
		{ id: "tea", name: "Tea", quantity: 1, total: 5000, box: null },
	],
	extras: 0,
	discount: 0,
	printedTotal: null,
	...overrides,
});

describe("allocate", () => {
	it("always sums to the amount", () => {
		expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
		expect(allocate(1, [1, 1])).toEqual([1, 0]);
		expect(allocate(1000, [3, 1])).toEqual([750, 250]);
	});

	it("returns zeros when there is nothing to weigh by", () => {
		expect(allocate(500, [0, 0])).toEqual([0, 0]);
	});
});

describe("computeSplit", () => {
	it("splits shared items equally and leaves unclaimed items", () => {
		const result = computeSplit(receipt(), [
			person("a", ["pizza", "beer"], 1),
			person("b", ["pizza"], 2),
		]);
		expect(result.shares.get("a")?.total).toBe(15000 + 16000);
		expect(result.shares.get("b")?.total).toBe(15000);
		expect(result.unclaimedItemIds).toEqual(["tea"]);
		expect(result.unclaimedTotal).toBe(5000);
	});

	it("spreads service and discount proportionally", () => {
		const result = computeSplit(receipt({ extras: 5100, discount: 1000 }), [
			person("a", ["pizza", "beer", "tea"], 1),
			person("b", ["tea"], 2),
		]);
		const a = result.shares.get("a");
		const b = result.shares.get("b");
		expect(a && b && a.total + b.total).toBe(51000 + 5100 - 1000);
		expect(a?.extras).toBeGreaterThan(b?.extras ?? 0);
	});
});

describe("formatReceiptDate", () => {
	it("formats ISO dates and leaves others alone", () => {
		expect(formatReceiptDate("2026-11-12T20:41:00")).toBe("12.11.2026 20:41");
		expect(formatReceiptDate("2026-11-12")).toBe("12.11.2026");
		expect(formatReceiptDate("12/11/26")).toBe("12/11/26");
		expect(formatReceiptDate(null)).toBeNull();
	});
});
