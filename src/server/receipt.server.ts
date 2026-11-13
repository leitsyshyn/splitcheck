import { ThinkingLevel } from "@google/genai";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { Receipt } from "#/lib/types";
import { ai, config, usesVertex } from "./gcp.server";

const PROMPT = `You are reading a photo of a restaurant, bar, cafe or shop receipt (often in Ukrainian).
Extract every purchased line item exactly once.

Rules:
- "name": the item name as printed, cleaned up (fix OCR noise, keep the original language, no quantity or price inside the name).
- "quantity": number of units on that line (1 if not printed).
- "line_total": the final price of the whole line (quantity × unit price, after any per-line discount), as a decimal number.
- "box_2d": bounding box of that line on the image as [ymin, xmin, ymax, xmax] normalised to 0-1000.
- Do NOT include subtotals, totals, taxes already included in prices (e.g. ПДВ/VAT lines), payment method lines, change, or the receipt-level service charge as items.
- "service_and_tip": service charge ("обслуговування", "сервіс", "service") plus any tip printed on the receipt, 0 if none.
- "discount": receipt-level discount applied to the total, as a positive number, 0 if none.
- "total": the grand total to pay as printed, or null if not visible.
- "merchant": the venue name in normal capitalisation even if printed in capitals (e.g. «Кафе Затишок», not «КАФЕ "ЗАТИШОК"»), without legal prefixes like ТОВ/ФОП; null if absent.
- "currency": ISO 4217 code (₴ / грн → UAH, € → EUR, zł → PLN, etc).
- If the image is not a receipt, return an empty "items" array.`;

const responseSchema = {
	type: "object",
	properties: {
		is_receipt: { type: "boolean" },
		merchant: { type: ["string", "null"] },
		date: {
			type: ["string", "null"],
			description: "As printed, ISO if possible",
		},
		currency: { type: "string" },
		items: {
			type: "array",
			items: {
				type: "object",
				properties: {
					name: { type: "string" },
					quantity: { type: "number" },
					line_total: { type: "number" },
					box_2d: {
						type: "array",
						items: { type: "integer" },
						minItems: 4,
						maxItems: 4,
					},
				},
				required: ["name", "quantity", "line_total", "box_2d"],
			},
		},
		service_and_tip: { type: "number" },
		discount: { type: "number" },
		total: { type: ["number", "null"] },
	},
	required: [
		"is_receipt",
		"merchant",
		"date",
		"currency",
		"items",
		"service_and_tip",
		"discount",
		"total",
	],
} as const;

const GeminiReceipt = z.object({
	is_receipt: z.boolean(),
	merchant: z.string().nullable(),
	date: z.string().nullable(),
	currency: z.string(),
	items: z.array(
		z.object({
			name: z.string(),
			quantity: z.number(),
			line_total: z.number(),
			box_2d: z.array(z.number()),
		}),
	),
	service_and_tip: z.number(),
	discount: z.number(),
	total: z.number().nullable(),
});

const toMinor = (value: number) => Math.max(0, Math.round(value * 100));
const clampBox = (v: number) => Math.min(1000, Math.max(0, Math.round(v)));

export class NotAReceiptError extends Error {
	constructor() {
		super("Схоже, на фото немає чека. Спробуйте ще раз, ближче й рівніше.");
	}
}

/**
 * Sends the receipt image (already uploaded to Cloud Storage) to Gemini on
 * Vertex AI and gets back structured JSON constrained by `responseSchema`.
 * Vertex reads the image straight from the bucket via its gs:// URI.
 */
export async function parseReceipt(image: {
	gcsUri: string;
	bytes: Uint8Array;
	mimeType: string;
}): Promise<{ receipt: Receipt; model: string; ms: number }> {
	const started = Date.now();
	const imagePart = usesVertex()
		? { fileData: { fileUri: image.gcsUri, mimeType: image.mimeType } }
		: {
				inlineData: {
					data: Buffer.from(image.bytes).toString("base64"),
					mimeType: image.mimeType,
				},
			};
	const response = await ai().models.generateContent({
		model: config.model,
		contents: [{ role: "user", parts: [imagePart, { text: PROMPT }] }],
		config: {
			temperature: 0,
			// LOW thinking: same accuracy on receipts as the default, ~2.3× faster (≈4 s vs ≈9 s).
			thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
			responseMimeType: "application/json",
			responseJsonSchema: responseSchema,
		},
	});

	const parsed = GeminiReceipt.parse(JSON.parse(response.text ?? "{}"));
	if (!parsed.is_receipt || parsed.items.length === 0) {
		throw new NotAReceiptError();
	}

	const currency = /^[A-Z]{3}$/.test(parsed.currency.toUpperCase())
		? parsed.currency.toUpperCase()
		: "UAH";

	const receipt: Receipt = {
		merchant: parsed.merchant?.slice(0, 120) || null,
		date: parsed.date?.slice(0, 40) || null,
		currency,
		items: parsed.items
			.filter((item) => item.name.trim().length > 0)
			.slice(0, 200)
			.map((item) => ({
				id: nanoid(8),
				name: item.name.trim().slice(0, 120),
				quantity: item.quantity > 0 ? Math.min(item.quantity, 999) : 1,
				total: toMinor(item.line_total),
				box:
					item.box_2d.length === 4
						? [
								clampBox(item.box_2d[0]),
								clampBox(item.box_2d[1]),
								clampBox(item.box_2d[2]),
								clampBox(item.box_2d[3]),
							]
						: null,
			})),
		extras: toMinor(parsed.service_and_tip),
		discount: toMinor(parsed.discount),
		printedTotal: parsed.total === null ? null : toMinor(parsed.total),
	};

	return { receipt, model: config.model, ms: Date.now() - started };
}
