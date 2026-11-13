/** Renders the first TanStack Form validation error (string or Standard Schema issue). */
export function FieldError({ errors }: { errors: unknown[] }) {
	const first = errors[0];
	if (!first) return null;
	const message =
		typeof first === "string"
			? first
			: typeof first === "object" && "message" in first
				? String((first as { message: unknown }).message)
				: "Невірне значення";
	return <p className="text-sm text-destructive">{message}</p>;
}
