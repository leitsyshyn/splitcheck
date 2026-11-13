import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

/**
 * Cloud Run terminates TLS in front of the container, so the request the app
 * sees is `http://…` while browsers send `Origin: https://…`. Compare the
 * Origin against the public origin reconstructed from the proxy headers
 * (a cross-site page cannot set these on a browser request).
 */
const csrfMiddleware = createCsrfMiddleware({
	filter: (ctx) => ctx.handlerType === "serverFn",
	origin: (value, { request }) => {
		const url = new URL(request.url);
		const proto =
			request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
			url.protocol.replace(":", "");
		const host = request.headers.get("host") ?? url.host;
		return value === `${proto}://${host}`;
	},
});

export const startInstance = createStart(() => ({
	requestMiddleware: [csrfMiddleware],
}));
