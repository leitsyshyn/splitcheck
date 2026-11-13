import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { Button } from "#/components/ui/button";
import { getSavedName, saveIdentity } from "#/lib/identity";
import { joinRoomFn } from "#/lib/rooms.functions";
import { NameSchema, type RoomSnapshot } from "#/lib/types";
import { FieldError } from "./field-error";
import { NameInput } from "./name-input";
import { PersonStack } from "./person";

export function JoinCard({ snapshot }: { snapshot: RoomSnapshot }) {
	const { room, participants } = snapshot;
	const join = useMutation({
		mutationFn: (name: string) =>
			joinRoomFn({ data: { roomId: room.id, name } }),
		onSuccess: ({ participantId }) => saveIdentity(room.id, { participantId }),
	});
	const form = useForm({
		defaultValues: { name: getSavedName() },
		onSubmit: ({ value }) => join.mutateAsync(value.name.trim()),
	});

	return (
		<form
			className="receipt-slip mx-auto mt-10 max-w-md space-y-4 rounded-t-2xl p-5 pb-7"
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
		>
			<div className="flex items-center gap-3">
				<h1 className="flex-1 font-display text-xl font-bold">
					{room.receipt.merchant ?? "Чек"}
				</h1>
				<PersonStack people={participants} />
			</div>
			<form.Field name="name" validators={{ onSubmit: NameSchema }}>
				{(field) => (
					<NameInput
						autoFocus
						value={field.state.value}
						errors={field.state.meta.errors}
						onChange={field.handleChange}
					/>
				)}
			</form.Field>
			{join.error && <FieldError errors={[join.error.message]} />}
			<Button
				type="submit"
				size="lg"
				className="h-12 w-full rounded-xl text-base"
				disabled={join.isPending}
			>
				Приєднатися
			</Button>
		</form>
	);
}
