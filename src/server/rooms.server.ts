import { randomUUID, timingSafeEqual } from "node:crypto";
import {
	type DocumentSnapshot,
	FieldValue,
	type QuerySnapshot,
	Timestamp,
} from "@google-cloud/firestore";
import { customAlphabet } from "nanoid";
import {
	PARTICIPANT_COLORS,
	type Participant,
	type Receipt,
	type Room,
	type RoomSnapshot,
} from "#/lib/types";
import { bucket, config, db } from "./gcp.server";
import { getUahRate } from "./nbu.server";
import { parseReceipt } from "./receipt.server";

const roomId = customAlphabet("23456789abcdefghjkmnpqrstuvwxyz", 8);
/** Rooms, participants and photos are throwaway: Firestore TTL and a bucket lifecycle rule clean them up. */
const ROOM_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type RoomDoc = Omit<Room, "id"> & {
	hostToken: string;
	imagePath: string;
	imageMime: string;
	expireAt: Timestamp;
};
type ParticipantDoc = Omit<Participant, "id"> & { expireAt: Timestamp };

const rooms = () => db().collection("rooms");
const roomRef = (id: string) => rooms().doc(id);
const participantsRef = (id: string) => roomRef(id).collection("participants");

export class RoomError extends Error {}

function toRoom(snap: DocumentSnapshot): Room | null {
	const data = snap.data() as RoomDoc | undefined;
	if (!data) return null;
	const {
		hostToken: _hostToken,
		imagePath: _imagePath,
		imageMime: _imageMime,
		expireAt: _expireAt,
		...room
	} = data;
	return { ...room, id: snap.id };
}

function toParticipants(snap: QuerySnapshot): Participant[] {
	return snap.docs
		.map((doc) => {
			const { expireAt: _expireAt, ...p } = doc.data() as ParticipantDoc;
			return { ...p, id: doc.id };
		})
		.sort((a, b) => a.joinedAt - b.joinedAt);
}

async function assertHost(id: string, hostToken: string): Promise<RoomDoc> {
	const snap = await roomRef(id).get();
	const data = snap.data() as RoomDoc | undefined;
	if (!data) throw new RoomError("Кімнату не знайдено");
	const a = Buffer.from(data.hostToken);
	const b = Buffer.from(hostToken);
	if (a.length !== b.length || !timingSafeEqual(a, b)) {
		throw new RoomError("Лише автор чека може це змінити");
	}
	return data;
}

/**
 * The whole pipeline in one place:
 * photo → Cloud Storage → Gemini (Vertex AI) reads it from gs:// → NBU rate
 * if foreign currency → Firestore room + host participant.
 */
export async function createRoom(input: {
	hostName: string;
	image: Uint8Array;
	mimeType: string;
}) {
	const id = roomId();
	const imagePath = `receipts/${id}.${input.mimeType === "image/png" ? "png" : "jpg"}`;
	await bucket()
		.file(imagePath)
		.save(input.image, {
			contentType: input.mimeType,
			resumable: false,
			metadata: { cacheControl: "private, max-age=86400" },
		});

	const { receipt, model, ms } = await parseReceipt({
		gcsUri: `gs://${config.bucket}/${imagePath}`,
		bytes: input.image,
		mimeType: input.mimeType,
	});
	const uahRate = await getUahRate(receipt.currency);

	const hostToken = randomUUID();
	const hostId = randomUUID();
	const now = Date.now();
	const expireAt = Timestamp.fromMillis(now + ROOM_TTL_MS);

	const batch = db().batch();
	batch.create(roomRef(id), {
		createdAt: now,
		status: "review",
		receipt,
		payerId: hostId,
		paymentNote: "",
		uahRate,
		model,
		parseMs: ms,
		hostToken,
		imagePath,
		imageMime: input.mimeType,
		expireAt,
	} satisfies RoomDoc);
	batch.create(participantsRef(id).doc(hostId), {
		name: input.hostName,
		color: PARTICIPANT_COLORS[0],
		claims: [],
		joinedAt: now,
		expireAt,
	} satisfies ParticipantDoc);
	await batch.commit();

	return { roomId: id, hostToken, participantId: hostId };
}

export async function getRoomSnapshot(
	id: string,
): Promise<RoomSnapshot | null> {
	const [roomSnap, participantsSnap] = await Promise.all([
		roomRef(id).get(),
		participantsRef(id).get(),
	]);
	const room = toRoom(roomSnap);
	if (!room) return null;
	return { room, participants: toParticipants(participantsSnap) };
}

/**
 * Firestore realtime listeners on the room doc and its participants
 * subcollection. Every change emits a full, merged snapshot.
 */
export function watchRoom(
	id: string,
	onChange: (snapshot: RoomSnapshot | null) => void,
	onError: (error: Error) => void,
): () => void {
	let room: Room | null | undefined;
	let participants: Participant[] | undefined;
	const emit = () => {
		if (room === undefined || participants === undefined) return;
		onChange(room ? { room, participants } : null);
	};
	const unsubRoom = roomRef(id).onSnapshot((snap) => {
		room = toRoom(snap);
		emit();
	}, onError);
	const unsubParticipants = participantsRef(id).onSnapshot((snap) => {
		participants = toParticipants(snap);
		emit();
	}, onError);
	return () => {
		unsubRoom();
		unsubParticipants();
	};
}

export async function readRoomImage(id: string) {
	const snap = await roomRef(id).get();
	const data = snap.data() as RoomDoc | undefined;
	if (!data) return null;
	const [buffer] = await bucket().file(data.imagePath).download();
	return { buffer, mimeType: data.imageMime };
}

/** Host confirms the (possibly corrected) receipt and opens the room. */
export async function publishReceipt(input: {
	roomId: string;
	hostToken: string;
	receipt: Receipt;
	paymentNote: string;
}) {
	await assertHost(input.roomId, input.hostToken);
	await roomRef(input.roomId).update({
		receipt: input.receipt,
		paymentNote: input.paymentNote,
		status: "open",
	});
}

export async function joinRoom(input: { roomId: string; name: string }) {
	const ref = roomRef(input.roomId);
	const id = randomUUID();
	await db().runTransaction(async (tx) => {
		const roomSnap = await tx.get(ref);
		if (!roomSnap.exists) throw new RoomError("Кімнату не знайдено");
		const existing = await tx.get(participantsRef(input.roomId));
		if (existing.size >= 30) throw new RoomError("У кімнаті вже 30 людей");
		const room = roomSnap.data() as RoomDoc;
		tx.create(participantsRef(input.roomId).doc(id), {
			name: input.name,
			color: PARTICIPANT_COLORS[existing.size % PARTICIPANT_COLORS.length],
			claims: [],
			joinedAt: Date.now(),
			expireAt: room.expireAt,
		} satisfies ParticipantDoc);
	});
	return { participantId: id };
}

export async function setClaim(input: {
	roomId: string;
	participantId: string;
	itemId: string;
	claimed: boolean;
}) {
	try {
		await participantsRef(input.roomId)
			.doc(input.participantId)
			.update({
				claims: input.claimed
					? FieldValue.arrayUnion(input.itemId)
					: FieldValue.arrayRemove(input.itemId),
			});
	} catch {
		throw new RoomError(
			"Учасника не знайдено. Приєднайтеся до кімнати ще раз.",
		);
	}
}
