import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { cn } from "cn";
import { ChevronRight, Hourglass } from "lucide-react";
import { useState } from "react";
import { ItemList } from "#/components/item-list";
import { JoinCard } from "#/components/join-card";
import { Logo } from "#/components/logo";
import { PersonDot } from "#/components/person";
import { ReceiptImage } from "#/components/receipt-image";
import { ReviewEditor } from "#/components/review-editor";
import { ShareDialog } from "#/components/share-dialog";
import { Summary } from "#/components/summary";
import { Button } from "#/components/ui/button";
import { Skeleton } from "#/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs";
import { useIdentity } from "#/lib/identity";
import {
	type LiveStatus,
	roomQuery,
	useLiveRoom,
	useToggleClaim,
} from "#/lib/room-query";
import { computeSplit, formatMoney, formatUah } from "#/lib/split";
import { isRoomId, type Participant, type RoomSnapshot } from "#/lib/types";

export const Route = createFileRoute("/r/$roomId")({
	loader: async ({ context, params }) => {
		if (!isRoomId(params.roomId)) throw notFound();
		if (!(await context.queryClient.ensureQueryData(roomQuery(params.roomId))))
			throw notFound();
	},
	head: () => ({ meta: [{ title: "splitcheck" }] }),
	component: RoomPage,
	notFoundComponent: RoomNotFound,
});

function RoomPage() {
	const { roomId } = Route.useParams();
	const { data: snapshot } = useSuspenseQuery(roomQuery(roomId));
	const live = useLiveRoom(roomId);
	const identity = useIdentity(roomId);
	const [shareOpen, setShareOpen] = useState(false);

	if (!snapshot) return <RoomNotFound />;
	const { room } = snapshot;
	const me = snapshot.participants.find(
		(p) => p.id === identity?.participantId,
	);

	return (
		<main className="mx-auto min-h-dvh max-w-6xl px-4 pt-5 pb-28">
			<header className="flex items-center gap-3">
				<Logo />
				<LiveDot status={live} />
				{room.status === "open" && (
					<div className="ml-auto">
						<ShareDialog
							roomId={roomId}
							open={shareOpen}
							onOpenChange={setShareOpen}
						/>
					</div>
				)}
			</header>

			{identity === undefined ? (
				<Skeleton className="mt-8 h-96 w-full rounded-2xl" />
			) : room.status === "review" ? (
				identity?.hostToken ? (
					<ReviewEditor
						room={room}
						hostToken={identity.hostToken}
						onPublished={() => setShareOpen(true)}
					/>
				) : (
					<Waiting />
				)
			) : me ? (
				<OpenRoom snapshot={snapshot} me={me} />
			) : (
				<JoinCard snapshot={snapshot} />
			)}
		</main>
	);
}

function OpenRoom({
	snapshot,
	me,
}: {
	snapshot: RoomSnapshot;
	me: Participant;
}) {
	const { room, participants } = snapshot;
	const [highlight, setHighlight] = useState<string | null>(null);
	const [tab, setTab] = useState("items");
	const toggle = useToggleClaim(room.id, me.id);
	const split = computeSplit(room.receipt, participants);
	const myTotal = split.shares.get(me.id)?.total ?? 0;
	const money = (minor: number) => formatMoney(minor, room.receipt.currency);
	const uah = (minor: number) => formatUah(minor, room.uahRate);

	const focusItem = (id: string) => {
		setHighlight(id);
		setTab("items");
		requestAnimationFrame(() =>
			document
				.getElementById(`item-${id}`)
				?.scrollIntoView({ block: "center", behavior: "smooth" }),
		);
	};
	const photo = (
		<ReceiptImage
			roomId={room.id}
			items={room.receipt.items}
			participants={participants}
			highlightId={highlight}
			onSelect={focusItem}
		/>
	);

	return (
		<>
			<section className="mt-6 flex items-baseline gap-3">
				<h1 className="font-display text-xl font-bold sm:text-3xl">
					{room.receipt.merchant ?? "Чек"}
				</h1>
				<span className="money ml-auto text-right text-muted-foreground">
					{money(split.grandTotal)}
					{room.uahRate && (
						<span className="block text-xs">{uah(split.grandTotal)}</span>
					)}
				</span>
			</section>

			<div className="mt-5 grid gap-6 lg:grid-cols-2 lg:items-start">
				<div className="hidden lg:sticky lg:top-6 lg:block lg:max-h-[85vh] lg:overflow-y-auto">
					{photo}
				</div>

				<Tabs value={tab} onValueChange={setTab}>
					<TabsList className="w-full">
						<TabsTrigger value="items">Позиції</TabsTrigger>
						<TabsTrigger value="summary">Підсумок</TabsTrigger>
						<TabsTrigger value="photo" className="lg:hidden">
							Фото
						</TabsTrigger>
					</TabsList>
					<TabsContent
						value="items"
						className="receipt-slip mt-3 rounded-t-2xl px-2 pb-4"
					>
						<ItemList
							receipt={room.receipt}
							participants={participants}
							me={me}
							highlightId={highlight}
							onFocusItem={setHighlight}
							onToggle={(itemId, claimed) => toggle.mutate({ itemId, claimed })}
						/>
					</TabsContent>
					<TabsContent value="summary" className="mt-3">
						<Summary snapshot={snapshot} me={me} />
					</TabsContent>
					<TabsContent value="photo" className="mt-3 lg:hidden">
						{photo}
					</TabsContent>
				</Tabs>
			</div>

			<button
				type="button"
				onClick={() => {
					setTab("summary");
					window.scrollTo({ top: 0, behavior: "smooth" });
				}}
				className="fixed inset-x-0 bottom-0 z-20 border-t bg-card/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
			>
				<span className="mx-auto flex max-w-6xl items-center gap-3 text-left">
					<PersonDot person={me} size="lg" />
					{myTotal > 0 ? (
						<span className="flex-1">
							<span className="block text-xs text-muted-foreground">
								Ваша частка
							</span>
							<span className="money text-xl font-bold">{money(myTotal)}</span>
							{room.uahRate && (
								<span className="money ml-2 text-sm text-muted-foreground">
									{uah(myTotal)}
								</span>
							)}
						</span>
					) : (
						<span className="flex-1 font-semibold">Оберіть свої позиції</span>
					)}
					<ChevronRight className="text-muted-foreground" />
				</span>
			</button>
		</>
	);
}

function LiveDot({ status }: { status: LiveStatus }) {
	return (
		<output
			aria-label={status}
			className={cn(
				"inline-block size-2.5 rounded-full",
				status === "live" && "animate-pulse bg-mint",
				status === "connecting" && "bg-amber-400",
				status === "offline" && "bg-destructive",
			)}
		/>
	);
}

function Waiting() {
	return (
		<div className="mt-24 text-center">
			<Hourglass className="mx-auto size-10 animate-pulse text-tomato" />
			<h1 className="mt-4 font-display text-xl font-bold">
				Автор ще перевіряє чек
			</h1>
		</div>
	);
}

function RoomNotFound() {
	return (
		<main className="mt-32 text-center">
			<h1 className="font-display text-xl font-bold">Кімнату не знайдено</h1>
			<Button asChild className="mt-6 rounded-full">
				<Link to="/">Новий чек</Link>
			</Button>
		</main>
	);
}
