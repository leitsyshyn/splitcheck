import { defineConfig } from "vitest/config";

// Kept separate from vite.config.ts so tests don't boot Nitro / TanStack Start.
export default defineConfig({
	resolve: { tsconfigPaths: true },
	test: { include: ["src/**/*.test.ts"] },
});
