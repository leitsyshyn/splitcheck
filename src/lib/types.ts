import { z } from "zod";

export const isRoomId = (id: string) => /^[a-z0-9]{8}$/.test(id);

export const NameSchema = z.string().trim().min(1, "Як вас звати?").max(40);

/** Normalised [ymin, xmin, ymax, xmax] in 0..1000, as Gemini returns it. */
export const BoxSchema = z.tuple([
	z.number(),
	z.number(),
	z.number(),
	z.number(),
]);
export type Box = z.infer<typeof BoxSchema>;

/** All money is stored in minor units (kopecks / cents) as integers. */
export const ReceiptItemSchema = z.object({
	id: z.string().min(1),
	name: z.string().trim().min(1).max(120),
	quantity: z.number().positive().max(999),
	total: z.number().int().min(0),
	box: BoxSchema.nullable(),
});
export type ReceiptItem = z.infer<typeof ReceiptItemSchema>;

export const ReceiptSchema = z.object({
	merchant: z.string().max(120).nullable(),
	date: z.string().max(40).nullable(),
	currency: z.string().length(3),
	items: z.array(ReceiptItemSchema).min(1).max(200),
	/** Service charge + tip that should be shared proportionally. */
	extras: z.number().int().min(0),
	/** Receipt-level discount, shared proportionally. */
	discount: z.number().int().min(0),
	/** Grand total as printed on the receipt (used to sanity-check the parse). */
	printedTotal: z.number().int().min(0).nullable(),
});
export type Receipt = z.infer<typeof ReceiptSchema>;

export type RoomStatus = "review" | "open";

export type Room = {
	id: string;
	createdAt: number;
	status: RoomStatus;
	receipt: Receipt;
	payerId: string;
	paymentNote: string;
	/** UAH per 1 unit of receipt currency (NBU official rate), when currency ≠ UAH. */
	uahRate: { rate: number; date: string } | null;
	model: string;
	parseMs: number;
};

export type Participant = {
	id: string;
	name: string;
	color: string;
	claims: string[];
	joinedAt: number;
};

export type RoomSnapshot = {
	room: Room;
	participants: Participant[];
};

export const PARTICIPANT_COLORS = [
	"#e4572e",
	"#2e86ab",
	"#17a34a",
	"#a855f7",
	"#f59e0b",
	"#ec4899",
	"#0d9488",
	"#6366f1",
	"#84cc16",
	"#64748b",
] as const;
