import { cn } from "cn";
import type { Participant } from "#/lib/types";

export function initials(name: string) {
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

export function PersonDot({
	person,
	size = "sm",
	className,
}: {
	person: Pick<Participant, "name" | "color">;
	size?: "sm" | "md" | "lg";
	className?: string;
}) {
	return (
		<span
			title={person.name}
			className={cn(
				"inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-card",
				size === "sm" && "size-6 text-[10px]",
				size === "md" && "size-8 text-xs",
				size === "lg" && "size-10 text-sm",
				className,
			)}
			style={{ backgroundColor: person.color }}
		>
			{initials(person.name)}
		</span>
	);
}

export function PersonStack({ people }: { people: Participant[] }) {
	return (
		<span className="flex -space-x-1.5">
			{people.slice(0, 5).map((p) => (
				<PersonDot key={p.id} person={p} />
			))}
			{people.length > 5 && (
				<span className="inline-flex size-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold ring-2 ring-card">
					+{people.length - 5}
				</span>
			)}
		</span>
	);
}
