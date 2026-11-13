import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
	assertCanParseReceipt,
	RateLimitError,
} from "#/server/rate-limit.server";
import { NotAReceiptError } from "#/server/receipt.server";
import {
	createRoom,
	getRoomSnapshot,
	joinRoom,
	publishReceipt,
	RoomError,
	setClaim,
} from "#/server/rooms.server";
import { isRoomId, NameSchema, ReceiptSchema } from "./types";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

const RoomId = z.string().refine(isRoomId);

/** Turns known domain errors into user-facing messages, hides the rest. */
async function userFacing<T>(run: () => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		if (
			error instanceof RoomError ||
			error instanceof NotAReceiptError ||
			error instanceof RateLimitError
		) {
			throw new Error(error.message);
		}
		console.error(error);
		throw new Error("Щось пішло не так на сервері. Спробуйте ще раз.");
	}
}

export const createRoomFn = createServerFn({ method: "POST" })
	.validator((data: FormData) => {
		if (!(data instanceof FormData)) throw new Error("Expected FormData");
		const image = data.get("image");
		if (!(image instanceof File)) throw new Error("Додайте фото чека");
		if (!ALLOWED_MIME.has(image.type))
			throw new Error("Потрібне фото JPG/PNG/WebP");
		if (image.size > MAX_IMAGE_BYTES)
			throw new Error("Фото завелике (до 8 МБ)");
		return { image, hostName: NameSchema.parse(data.get("hostName")) };
	})
	.handler(async ({ data }) =>
		userFacing(async () => {
			assertCanParseReceipt();
			return createRoom({
				hostName: data.hostName,
				image: new Uint8Array(await data.image.arrayBuffer()),
				mimeType: data.image.type,
			});
		}),
	);

export const getRoomFn = createServerFn({ method: "GET" })
	.validator(z.object({ roomId: RoomId }))
	.handler(({ data }) => getRoomSnapshot(data.roomId));

export const publishReceiptFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			roomId: RoomId,
			hostToken: z.string().uuid(),
			receipt: ReceiptSchema,
			paymentNote: z.string().trim().max(200),
		}),
	)
	.handler(({ data }) => userFacing(() => publishReceipt(data)));

export const joinRoomFn = createServerFn({ method: "POST" })
	.validator(z.object({ roomId: RoomId, name: NameSchema }))
	.handler(({ data }) => userFacing(() => joinRoom(data)));

export const setClaimFn = createServerFn({ method: "POST" })
	.validator(
		z.object({
			roomId: RoomId,
			participantId: z.string().uuid(),
			itemId: z.string().min(1).max(20),
			claimed: z.boolean(),
		}),
	)
	.handler(({ data }) => userFacing(() => setClaim(data)));
