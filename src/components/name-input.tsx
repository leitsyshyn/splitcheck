import { Input } from "#/components/ui/input";
import { saveName } from "#/lib/identity";
import { FieldError } from "./field-error";

/** Name field shared by "create room" and "join room"; remembers the last value. */
export function NameInput(props: {
	value: string;
	errors: unknown[];
	onChange: (value: string) => void;
	autoFocus?: boolean;
}) {
	return (
		<div className="space-y-1.5">
			<Input
				aria-label="Ваше ім'я"
				placeholder="Ваше ім'я"
				autoComplete="given-name"
				autoFocus={props.autoFocus}
				className="h-12 text-base"
				value={props.value}
				aria-invalid={props.errors.length > 0}
				onChange={(e) => {
					props.onChange(e.target.value);
					saveName(e.target.value);
				}}
			/>
			<FieldError errors={props.errors} />
		</div>
	);
}
