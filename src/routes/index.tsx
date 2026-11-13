import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Camera, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FieldError } from "#/components/field-error";
import { Logo } from "#/components/logo";
import { NameInput } from "#/components/name-input";
import { Button } from "#/components/ui/button";
import { getSavedName, saveIdentity } from "#/lib/identity";
import { prepareImage } from "#/lib/image";
import { createRoomFn } from "#/lib/rooms.functions";
import { NameSchema } from "#/lib/types";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
	const navigate = useNavigate();
	const [preview, setPreview] = useState<string | null>(null);

	const create = useMutation({
		mutationFn: async (value: { hostName: string; image: File }) => {
			const formData = new FormData();
			formData.set("hostName", value.hostName);
			formData.set("image", await prepareImage(value.image));
			return createRoomFn({ data: formData });
		},
		onSuccess: ({ roomId, participantId, hostToken }) => {
			saveIdentity(roomId, { participantId, hostToken });
			navigate({ to: "/r/$roomId", params: { roomId } });
		},
	});

	const form = useForm({
		defaultValues: { hostName: "", image: null as File | null },
		onSubmit: ({ value }) => {
			if (value.image)
				create.mutate({ hostName: value.hostName.trim(), image: value.image });
		},
	});

	useEffect(() => form.setFieldValue("hostName", getSavedName()), [form]);
	useEffect(
		() => () => void (preview && URL.revokeObjectURL(preview)),
		[preview],
	);

	return (
		<main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-6 pb-10">
			<Logo />

			<h1 className="mt-12 font-display text-[2.1rem] leading-[1.05] font-extrabold tracking-tight">
				Один чек.
				<br />
				<span className="text-tomato">Кожен платить</span> за своє.
			</h1>

			<form
				className="receipt-slip mt-8 space-y-4 rounded-t-2xl p-5 pb-7"
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<form.Field
					name="image"
					validators={{
						onSubmit: ({ value }) => (value ? undefined : "Додайте фото чека"),
					}}
				>
					{(field) => (
						<div className="space-y-1.5">
							<PhotoPicker
								preview={preview}
								scanning={create.isPending}
								onPick={(file) => {
									field.handleChange(file);
									setPreview(URL.createObjectURL(file));
									create.reset();
								}}
							/>
							<FieldError errors={field.state.meta.errors} />
						</div>
					)}
				</form.Field>

				<form.Field name="hostName" validators={{ onSubmit: NameSchema }}>
					{(field) => (
						<NameInput
							value={field.state.value}
							errors={field.state.meta.errors}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>

				{create.error && <FieldError errors={[create.error.message]} />}

				<Button
					type="submit"
					size="lg"
					className="h-12 w-full rounded-xl text-base"
					disabled={create.isPending}
				>
					{create.isPending ? (
						<>
							<Loader2 className="animate-spin" /> Gemini читає чек…
						</>
					) : (
						"Розділити чек"
					)}
				</Button>
			</form>
		</main>
	);
}

function PhotoPicker(props: {
	preview: string | null;
	scanning: boolean;
	onPick: (file: File) => void;
}) {
	const input = useRef<HTMLInputElement>(null);
	return (
		<button
			type="button"
			disabled={props.scanning}
			onClick={() => input.current?.click()}
			className="relative flex min-h-40 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-input transition hover:border-tomato disabled:cursor-wait"
		>
			<input
				ref={input}
				type="file"
				accept="image/*"
				className="sr-only"
				onChange={(e) => {
					const file = e.target.files?.[0];
					if (file) props.onPick(file);
					e.target.value = "";
				}}
			/>
			{props.preview ? (
				<>
					<img
						src={props.preview}
						alt="Фото чека"
						className="max-h-80 w-full object-contain"
					/>
					{props.scanning && <div className="scan-line" />}
				</>
			) : (
				<span className="flex flex-col items-center gap-2 text-muted-foreground">
					<Camera className="size-8" />
					<span className="font-semibold">Сфотографуйте чек</span>
				</span>
			)}
		</button>
	);
}
