import { z } from "zod";

const NbuRates = z.array(
	z.object({
		CurrencyCodeL: z.string(),
		Units: z.number(),
		Amount: z.number(),
		StartDate: z.string(),
	}),
);

/**
 * Official National Bank of Ukraine exchange rate (UAH per 1 unit of
 * `currency`). Public API, no key needed. Returns null on any failure: the
 * conversion is a nice-to-have, never a reason to fail room creation.
 */
export async function getUahRate(
	currency: string,
): Promise<{ rate: number; date: string } | null> {
	if (currency === "UAH") return null;
	try {
		const res = await fetch("https://bank.gov.ua/NBU_Exchange/exchange?json", {
			signal: AbortSignal.timeout(4000),
		});
		if (!res.ok) {
			console.warn("NBU rate request failed", res.status);
			return null;
		}
		const found = NbuRates.parse(await res.json()).find(
			(r) => r.CurrencyCodeL === currency,
		);
		return found
			? { rate: found.Amount / found.Units, date: found.StartDate }
			: null;
	} catch (error) {
		console.warn("NBU rate request failed", error);
		return null;
	}
}
