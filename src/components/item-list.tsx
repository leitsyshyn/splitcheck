import { cn } from "cn";
import { Check } from "lucide-react";
import { formatMoney } from "#/lib/split";
import type { Participant, Receipt } from "#/lib/types";
import { PersonStack } from "./person";

export function ItemList({
	receipt,
	participants,
	me,
	highlightId,
	onToggle,
	onFocusItem,
}: {
	receipt: Receipt;
	participants: Participant[];
	me: Participant;
	highlightId: string | null;
	onToggle: (itemId: string, claimed: boolean) => void;
	onFocusItem: (itemId: string) => void;
}) {
	return (
		<ul className="divide-y divide-dashed">
			{receipt.items.map((item) => {
				const claimers = participants.filter((p) => p.claims.includes(item.id));
				const mine = me.claims.includes(item.id);
				return (
					<li key={item.id} id={`item-${item.id}`}>
						<button
							type="button"
							onClick={() => {
								onFocusItem(item.id);
								onToggle(item.id, !mine);
							}}
							onMouseEnter={() => onFocusItem(item.id)}
							className={cn(
								"flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left transition-colors",
								highlightId === item.id && "bg-tomato-soft/60",
							)}
						>
							<span
								className={cn(
									"flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition",
									mine ? "border-transparent text-white" : "border-input",
								)}
								style={mine ? { backgroundColor: me.color } : undefined}
							>
								{mine && <Check className="size-3.5" strokeWidth={3} />}
							</span>
							<span className="min-w-0 flex-1">
								<span className="font-semibold leading-snug">{item.name}</span>
								{item.quantity !== 1 && (
									<span className="ml-1.5 text-muted-foreground">
										×{item.quantity}
									</span>
								)}
							</span>
							{claimers.length > 0 && <PersonStack people={claimers} />}
							<span className="money shrink-0 font-semibold">
								{formatMoney(item.total, receipt.currency)}
							</span>
						</button>
					</li>
				);
			})}
		</ul>
	);
}
