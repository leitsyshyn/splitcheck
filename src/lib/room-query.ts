import {
	queryOptions,
	useMutation,
	useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getRoomFn, setClaimFn } from "./rooms.functions";
import type { RoomSnapshot } from "./types";

export const roomQuery = (roomId: string) =>
	queryOptions({
		queryKey: ["room", roomId],
		queryFn: () => getRoomFn({ data: { roomId } }),
		staleTime: Number.POSITIVE_INFINITY,
	});

export type LiveStatus = "connecting" | "live" | "offline";

/**
 * Subscribes to the server's SSE stream (backed by Firestore onSnapshot) and
 * writes every pushed snapshot straight into the TanStack Query cache.
 * EventSource reconnects on its own after network drops.
 */
export function useLiveRoom(roomId: string): LiveStatus {
	const queryClient = useQueryClient();
	const [status, setStatus] = useState<LiveStatus>("connecting");

	useEffect(() => {
		const source = new EventSource(`/api/rooms/${roomId}/events`);
		source.onopen = () => setStatus("live");
		source.onmessage = (event) => {
			setStatus("live");
			queryClient.setQueryData(
				roomQuery(roomId).queryKey,
				JSON.parse(event.data) as RoomSnapshot | null,
			);
		};
		source.onerror = () => setStatus("offline");
		return () => source.close();
	}, [roomId, queryClient]);

	return status;
}

/** Tap an item to claim / unclaim it, with an optimistic cache update. */
export function useToggleClaim(roomId: string, participantId: string) {
	const queryClient = useQueryClient();
	const { queryKey } = roomQuery(roomId);

	return useMutation({
		mutationFn: (vars: { itemId: string; claimed: boolean }) =>
			setClaimFn({ data: { roomId, participantId, ...vars } }),
		onMutate: async ({ itemId, claimed }) => {
			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData(queryKey);
			queryClient.setQueryData(queryKey, (snap) =>
				snap
					? {
							...snap,
							participants: snap.participants.map((p) =>
								p.id !== participantId
									? p
									: {
											...p,
											claims: claimed
												? [...new Set([...p.claims, itemId])]
												: p.claims.filter((c) => c !== itemId),
										},
							),
						}
					: snap,
			);
			return { previous };
		},
		onError: (error, _vars, context) => {
			if (context?.previous)
				queryClient.setQueryData(queryKey, context.previous);
			toast.error(error.message);
		},
	});
}
