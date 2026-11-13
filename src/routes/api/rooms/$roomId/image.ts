import { createFileRoute } from "@tanstack/react-router";
import { isRoomId } from "#/lib/types";
import { readRoomImage } from "#/server/rooms.server";

/** Streams the receipt photo out of the private Cloud Storage bucket. */
export const Route = createFileRoute("/api/rooms/$roomId/image")({
	server: {
		handlers: {
			GET: async ({ params }) => {
				if (!isRoomId(params.roomId)) {
					return new Response("Bad room id", { status: 400 });
				}
				const image = await readRoomImage(params.roomId);
				if (!image) return new Response("Not found", { status: 404 });
				return new Response(new Uint8Array(image.buffer), {
					headers: {
						"Content-Type": image.mimeType,
						"Cache-Control": "private, max-age=86400, immutable",
					},
				});
			},
		},
	},
});
