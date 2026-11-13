import { useForm } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";
import { cn } from "cn";
import { Check, Plus, X } from "lucide-react";
import { nanoid } from "nanoid";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import { publishReceiptFn } from "#/lib/rooms.functions";
import { currencySymbol, formatMoney } from "#/lib/split";
import type { ReceiptItem, Room } from "#/lib/types";
import { ReceiptImage } from "./receipt-image";

type ItemDraft = Omit<ReceiptItem, "quantity" | "total"> & {
	quantity: string;
	total: string;
};

const toMajor = (minor: number) => (minor / 100).toFixed(2);
const toMinor = (major: string) => {
	const n = Number.parseFloat(major.replace(",", "."));
	return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : 0;
};

/** Gemini's output is a draft: the host fixes anything it misread, then opens the room. */
export function ReviewEditor({
	room,
	hostToken,
	onPublished,
}: {
	room: Room;
	hostToken: string;
	onPublished: () => void;
}) {
	const { receipt } = room;
	const symbol = currencySymbol(receipt.currency);
	const [highlight, setHighlight] = useState<string | null>(null);

	const publish = useMutation({
		mutationFn: publishReceiptFn,
		onSuccess: onPublished,
		onError: (error) => toast.error(error.message),
	});

	const form = useForm({
		defaultValues: {
			items: receipt.items.map(
				(item): ItemDraft => ({
					...item,
					quantity: String(item.quantity),
					total: toMajor(item.total),
				}),
			),
			extras: toMajor(receipt.extras),
			discount: toMajor(receipt.discount),
			paymentNote: room.paymentNote,
		},
		onSubmit: async ({ value }) => {
			const items = value.items
				.filter((item) => item.name.trim())
				.map((item) => ({
					...item,
					name: item.name.trim(),
					quantity: Math.max(0.001, Number.parseFloat(item.quantity) || 1),
					total: toMinor(item.total),
				}));
			if (items.length === 0)
				return void toast.error("Додайте хоча б одну позицію");
			await publish.mutateAsync({
				data: {
					roomId: room.id,
					hostToken,
					paymentNote: value.paymentNote.trim(),
					receipt: {
						...receipt,
						items,
						extras: toMinor(value.extras),
						discount: toMinor(value.discount),
					},
				},
			});
		},
	});

	return (
		<div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
			<ReceiptImage
				roomId={room.id}
				items={receipt.items}
				highlightId={highlight}
				onSelect={(id) => document.getElementById(`edit-${id}`)?.focus()}
				className="max-h-72 overflow-y-auto lg:sticky lg:top-6 lg:max-h-[85vh]"
			/>

			<form
				className="receipt-slip space-y-5 rounded-t-2xl p-4 pb-6 sm:p-5"
				onSubmit={(e) => {
					e.preventDefault();
					form.handleSubmit();
				}}
			>
				<h1 className="font-display text-xl font-bold">Перевірте чек</h1>

				<form.Field name="items" mode="array">
					{(items) => (
						<div className="space-y-2">
							{items.state.value.map((item, i) => (
								<div
									key={item.id}
									onFocusCapture={() => setHighlight(item.id)}
									className={cn(
										"grid grid-cols-[4.5rem_1fr_auto] gap-2 rounded-lg p-1.5 transition-colors sm:grid-cols-[1fr_4.5rem_7.5rem_auto]",
										highlight === item.id && "bg-tomato-soft",
									)}
								>
									<form.Field name={`items[${i}].name`}>
										{(f) => (
											<Input
												id={`edit-${item.id}`}
												aria-label="Назва"
												className="col-span-3 sm:col-span-1"
												value={f.state.value}
												onChange={(e) => f.handleChange(e.target.value)}
											/>
										)}
									</form.Field>
									<form.Field name={`items[${i}].quantity`}>
										{(f) => (
											<AffixInput
												prefix="×"
												aria-label="Кількість"
												value={f.state.value}
												onChange={f.handleChange}
											/>
										)}
									</form.Field>
									<form.Field name={`items[${i}].total`}>
										{(f) => (
											<AffixInput
												suffix={symbol}
												aria-label="Сума"
												value={f.state.value}
												onChange={f.handleChange}
											/>
										)}
									</form.Field>
									<Button
										type="button"
										variant="ghost"
										size="icon"
										aria-label="Видалити"
										onClick={() => items.removeValue(i)}
									>
										<X className="text-muted-foreground" />
									</Button>
								</div>
							))}
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={() =>
									items.pushValue({
										id: nanoid(8),
										name: "",
										quantity: "1",
										total: "",
										box: null,
									})
								}
							>
								<Plus /> Позиція
							</Button>
						</div>
					)}
				</form.Field>

				<div className="grid grid-cols-2 gap-3">
					<form.Field name="extras">
						{(f) => (
							<div className="space-y-1.5">
								<Label htmlFor="extras">Сервіс і чайові</Label>
								<AffixInput
									id="extras"
									suffix={symbol}
									value={f.state.value}
									onChange={f.handleChange}
								/>
							</div>
						)}
					</form.Field>
					<form.Field name="discount">
						{(f) => (
							<div className="space-y-1.5">
								<Label htmlFor="discount">Знижка</Label>
								<AffixInput
									id="discount"
									suffix={symbol}
									value={f.state.value}
									onChange={f.handleChange}
								/>
							</div>
						)}
					</form.Field>
				</div>

				<form.Field name="paymentNote">
					{(f) => (
						<Input
							aria-label="Куди переказувати"
							placeholder="Картка або банка для переказу"
							maxLength={200}
							value={f.state.value}
							onChange={(e) => f.handleChange(e.target.value)}
						/>
					)}
				</form.Field>

				<form.Subscribe selector={(s) => s.values}>
					{(v) => {
						const sum =
							v.items.reduce((acc, item) => acc + toMinor(item.total), 0) +
							toMinor(v.extras) -
							toMinor(v.discount);
						const printed = receipt.printedTotal;
						const matches = printed === null || Math.abs(sum - printed) <= 1;
						return (
							<div className="flex items-baseline gap-2 border-t border-dashed pt-4 font-semibold">
								Разом
								<span className="dotted-leader" />
								{!matches && printed !== null && (
									<span className="money text-sm text-tomato">
										на чеку {formatMoney(printed, receipt.currency)}
									</span>
								)}
								<span
									className={cn("money text-lg", !matches && "text-tomato")}
								>
									{formatMoney(sum, receipt.currency)}
								</span>
								{matches && printed !== null && (
									<Check className="size-4 self-center text-mint" />
								)}
							</div>
						);
					}}
				</form.Subscribe>

				<form.Subscribe selector={(s) => s.isSubmitting}>
					{(isSubmitting) => (
						<Button
							type="submit"
							size="lg"
							className="h-12 w-full rounded-xl text-base"
							disabled={isSubmitting}
						>
							Відкрити кімнату
						</Button>
					)}
				</form.Subscribe>
			</form>
		</div>
	);
}

function AffixInput({
	prefix,
	suffix,
	value,
	onChange,
	...props
}: {
	prefix?: string;
	suffix?: string;
	value: string;
	onChange: (value: string) => void;
	id?: string;
	"aria-label"?: string;
}) {
	return (
		<div className="relative">
			{prefix && (
				<span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
					{prefix}
				</span>
			)}
			<Input
				{...props}
				inputMode="decimal"
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className={cn("money", prefix && "pl-7", suffix && "pr-8 text-right")}
			/>
			{suffix && (
				<span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-muted-foreground">
					{suffix}
				</span>
			)}
		</div>
	);
}
