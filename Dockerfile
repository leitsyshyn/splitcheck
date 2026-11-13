# --- build ---
FROM node:24-slim AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# --- runtime ---
# The Google Cloud SDKs (gRPC + protobuf) stay external to the Nitro bundle,
# so production node_modules are installed next to .output.
FROM node:24-slim
WORKDIR /app
RUN corepack enable
ENV NODE_ENV=production PORT=8080
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --prod --frozen-lockfile --ignore-scripts && pnpm store prune
COPY --from=build /app/.output ./.output
EXPOSE 8080
USER node
CMD ["node", ".output/server/index.mjs"]
