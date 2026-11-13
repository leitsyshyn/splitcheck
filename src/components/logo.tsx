import { Link } from "@tanstack/react-router";

export function Logo() {
	return (
		<Link
			to="/"
			className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight"
		>
			<span className="flex size-8 items-center justify-center rounded-lg bg-foreground text-base text-background">
				🧾
			</span>
			splitcheck
		</Link>
	);
}
