const MAX_SIDE = 2000;

/**
 * Downscale phone photos (often 4000px+, several MB) to a JPEG that is plenty
 * for Gemini to read and uploads fast on mobile data. Falls back to the
 * original file if the browser cannot decode it (e.g. HEIC on desktop Chrome).
 */
export async function prepareImage(file: File): Promise<File> {
	try {
		const bitmap = await createImageBitmap(file, {
			imageOrientation: "from-image",
		});
		const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
		const width = Math.round(bitmap.width * scale);
		const height = Math.round(bitmap.height * scale);
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext("2d");
		if (!ctx) return file;
		ctx.drawImage(bitmap, 0, 0, width, height);
		bitmap.close();
		const blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, "image/jpeg", 0.85),
		);
		if (!blob) return file;
		return new File([blob], "receipt.jpg", { type: "image/jpeg" });
	} catch {
		return file;
	}
}
