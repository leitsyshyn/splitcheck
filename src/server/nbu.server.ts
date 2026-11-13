import { z } from "zod";

const NbuRate = z.array(
	z.object({ cc: z.string(), rate: z.number(), exchangedate: z.string() }),
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
		const url = `https://bank.gov.ua/NBUStatService/v1/statdir/exchange?valcode=${encodeURIComponent(currency)}&json`;
		const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
		if (!res.ok) return null;
		const [first] = NbuRate.parse(await res.json());
		return first ? { rate: first.rate, date: first.exchangedate } : null;
	} catch {
		return null;
	}
}
