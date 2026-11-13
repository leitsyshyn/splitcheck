import type { QueryClient } from "@tanstack/react-query";
import {
	createRootRouteWithContext,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { Toaster } from "#/components/ui/sonner";
import appCss from "../styles.css?url";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1, viewport-fit=cover",
			},
			{ name: "theme-color", content: "#f6f1e7" },
			{ title: "Splitcheck — ділимо чек по позиціях" },
			{
				name: "description",
				content:
					"Сфотографуй чек, Gemini розбере його на позиції, друзі відмітять своє — і всі бачать, хто кому скільки винен.",
			},
		],
		links: [
			{ rel: "stylesheet", href: appCss },
			{
				rel: "icon",
				href: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🧾</text></svg>",
			},
		],
	}),
	shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="uk">
			<head>
				<HeadContent />
			</head>
			<body>
				{children}
				<Toaster position="top-center" />
				<Scripts />
			</body>
		</html>
	);
}
