import { Copy, QrCode, Share2 } from "lucide-react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Button } from "#/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog";

export function ShareDialog({
	roomId,
	open,
	onOpenChange,
}: {
	roomId: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
}) {
	const url =
		typeof window === "undefined"
			? ""
			: `${window.location.origin}/r/${roomId}`;
	const canShare = typeof navigator !== "undefined" && "share" in navigator;
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogTrigger asChild>
				<Button size="sm" className="rounded-full">
					<QrCode /> Запросити
				</Button>
			</DialogTrigger>
			<DialogContent className="max-w-sm">
				<DialogTitle className="font-display">Запросити друзів</DialogTitle>
				<div className="mx-auto rounded-2xl bg-white p-4">
					<QRCode value={url} size={240} fgColor="#1d1b16" />
				</div>
				<div className="flex gap-2">
					<Button
						variant="outline"
						className="flex-1"
						onClick={() => {
							navigator.clipboard.writeText(url);
							toast.success("Посилання скопійовано");
						}}
					>
						<Copy /> Копіювати
					</Button>
					{canShare && (
						<Button
							variant="outline"
							className="flex-1"
							onClick={() => navigator.share({ url }).catch(() => {})}
						>
							<Share2 /> Поділитися
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
