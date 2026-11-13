import { cn } from "cn";
import type { Participant, ReceiptItem } from "#/lib/types";

/**
 * The original photo with every recognised line outlined, using the
 * [ymin, xmin, ymax, xmax] boxes (0..1000) that Gemini returned.
 */
export function ReceiptImage({
	roomId,
	items,
	participants = [],
	highlightId,
	onSelect,
	className,
}: {
	roomId: string;
	items: ReceiptItem[];
	participants?: Participant[];
	highlightId?: string | null;
	onSelect?: (itemId: string) => void;
	className?: string;
}) {
	return (
		<div className={cn("overflow-hidden rounded-xl border bg-card", className)}>
			{/* Boxes are % of the image, so they live in a wrapper sized exactly like it. */}
			<div className="relative">
				<img
					src={`/api/rooms/${roomId}/image`}
					alt="Фото чека"
					className="block w-full select-none"
					draggable={false}
				/>
				{items.map((item) => {
					if (!item.box) return null;
					const [ymin, xmin, ymax, xmax] = item.box;
					const claimers = participants.filter((p) =>
						p.claims.includes(item.id),
					);
					const active = item.id === highlightId;
					const color = claimers[0]?.color;
					return (
						<button
							key={item.id}
							type="button"
							aria-label={item.name}
							onClick={() => onSelect?.(item.id)}
							className={cn(
								"absolute rounded-[3px] border-2 transition-all",
								active
									? "z-10 border-tomato bg-tomato/25 shadow-[0_0_0_4px_rgba(228,87,46,0.25)]"
									: claimers.length > 0
										? "border-transparent"
										: "border-dashed border-foreground/25 hover:border-tomato",
							)}
							style={{
								top: `${ymin / 10}%`,
								left: `${xmin / 10}%`,
								height: `${(ymax - ymin) / 10}%`,
								width: `${(xmax - xmin) / 10}%`,
								backgroundColor: !active && color ? `${color}33` : undefined,
								borderColor: !active && color ? color : undefined,
							}}
						/>
					);
				})}
			</div>
		</div>
	);
}
