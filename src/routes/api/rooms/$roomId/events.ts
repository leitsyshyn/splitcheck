import { createFileRoute } from "@tanstack/react-router";
import { isRoomId } from "#/lib/types";
import { watchRoom } from "#/server/rooms.server";

const HEARTBEAT_MS = 20_000;

/**
 * Server-Sent Events stream. The server holds Firestore realtime listeners
 * (onSnapshot) for the room and pushes every change to the browser, so the
 * client never needs Firebase credentials or security rules.
 */
export const Route = createFileRoute("/api/rooms/$roomId/events")({
	server: {
		handlers: {
			GET: ({ params, request }) => {
				if (!isRoomId(params.roomId)) {
					return new Response("Bad room id", { status: 400 });
				}
				const encoder = new TextEncoder();
				let cleanup = () => {};

				const stream = new ReadableStream<Uint8Array>({
					start(controller) {
						const send = (chunk: string) => {
							try {
								controller.enqueue(encoder.encode(chunk));
							} catch {
								cleanup();
							}
						};
						const unsubscribe = watchRoom(
							params.roomId,
							(snapshot) => send(`data: ${JSON.stringify(snapshot)}\n\n`),
							(error) => {
								console.error("room listener failed", error);
								send("event: error\ndata: listener failed\n\n");
								cleanup();
							},
						);
						const heartbeat = setInterval(
							() => send(": ping\n\n"),
							HEARTBEAT_MS,
						);
						cleanup = () => {
							clearInterval(heartbeat);
							unsubscribe();
							cleanup = () => {};
							try {
								controller.close();
							} catch {}
						};
						request.signal.addEventListener("abort", () => cleanup());
					},
					cancel() {
						cleanup();
					},
				});

				return new Response(stream, {
					headers: {
						"Content-Type": "text/event-stream; charset=utf-8",
						"Cache-Control": "no-cache, no-transform",
						Connection: "keep-alive",
						"X-Accel-Buffering": "no",
					},
				});
			},
		},
	},
});
