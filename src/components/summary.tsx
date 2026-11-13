import { cn } from "cn";
import { ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";
import { computeSplit, formatMoney } from "#/lib/split";
import type { Participant, RoomSnapshot } from "#/lib/types";
import { PersonDot } from "./person";

export function Summary({
	snapshot,
	me,
}: {
	snapshot: RoomSnapshot;
	me: Participant;
}) {
	const { room, participants } = snapshot;
	const { receipt } = room;
	const split = computeSplit(receipt, participants);
	const payer = participants.find((p) => p.id === room.payerId);
	const itemName = new Map(receipt.items.map((i) => [i.id, i.name]));
	const money = (minor: number) => formatMoney(minor, receipt.currency);
	const debtors = participants.filter(
		(p) => p.id !== payer?.id && (split.shares.get(p.id)?.total ?? 0) > 0,
	);

	return (
		<div className="space-y-4">
			{split.unclaimedItemIds.length > 0 && (
				<div className="rounded-xl border-2 border-dashed border-tomato/50 bg-tomato-soft/50 p-3 text-sm">
					<p className="flex font-semibold">
						Нічиї позиції
						<span className="money ml-auto">{money(split.unclaimedTotal)}</span>
					</p>
					<p className="mt-1 text-muted-foreground">
						{split.unclaimedItemIds.map((id) => itemName.get(id)).join(", ")}
					</p>
				</div>
			)}

			<ul className="space-y-2">
				{participants.map((p) => {
					const share = split.shares.get(p.id);
					if (!share) return null;
					const lines = [
						...share.items.map((it) => ({
							key: it.itemId,
							label: `${itemName.get(it.itemId)}${it.sharedWith > 1 ? ` ÷${it.sharedWith}` : ""}`,
							amount: it.amount,
						})),
						...(share.extras
							? [{ key: "extras", label: "Сервіс", amount: share.extras }]
							: []),
						...(share.discount
							? [{ key: "discount", label: "Знижка", amount: -share.discount }]
							: []),
					];
					return (
						<li
							key={p.id}
							className={cn(
								"rounded-xl border bg-card p-3",
								p.id === me.id && "ring-2 ring-tomato/60",
							)}
						>
							<div className="flex items-center gap-3">
								<PersonDot person={p} size="md" />
								<span className="flex-1 font-semibold">{p.name}</span>
								<span className="money text-lg font-bold">
									{money(share.total)}
								</span>
							</div>
							{lines.length > 0 && (
								<ul className="mt-2 space-y-0.5 border-t border-dashed pt-2 text-sm text-muted-foreground">
									{lines.map((line) => (
										<li key={line.key} className="flex gap-2">
											<span className="truncate">{line.label}</span>
											<span className="dotted-leader" />
											<span className="money">{money(line.amount)}</span>
										</li>
									))}
								</ul>
							)}
						</li>
					);
				})}
			</ul>

			{payer && debtors.length > 0 && (
				<section className="receipt-slip space-y-2 rounded-t-2xl p-4 pb-6">
					{debtors.map((p) => {
						const owed = split.shares.get(p.id)?.total ?? 0;
						return (
							<p
								key={p.id}
								className="flex items-center gap-2 text-sm font-semibold"
							>
								<PersonDot person={p} />
								{p.name}
								<ArrowRight className="size-4 text-muted-foreground" />
								<PersonDot person={payer} />
								{payer.name}
								<span className="dotted-leader" />
								<span className="money">{money(owed)}</span>
								{room.uahRate && (
									<span className="money font-normal text-muted-foreground">
										≈ {formatMoney(Math.round(owed * room.uahRate.rate), "UAH")}
									</span>
								)}
							</p>
						);
					})}
					{room.paymentNote && (
						<button
							type="button"
							className="mt-2 flex w-full items-center gap-2 rounded-lg bg-muted px-3 py-2 text-left text-sm"
							onClick={() => {
								navigator.clipboard.writeText(room.paymentNote);
								toast.success("Скопійовано");
							}}
						>
							<span className="money min-w-0 flex-1 truncate">
								{room.paymentNote}
							</span>
							<Copy className="size-4 shrink-0" />
						</button>
					)}
				</section>
			)}
		</div>
	);
}
