FROM node:22-slim AS build

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app
COPY . .

ENV DOCKERIZED=true
ENV CI=true
ENV SKIP_INSTALL_SIMPLE_GIT_HOOKS=true

RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm run build

## Use distroless for the final image
FROM gcr.io/distroless/nodejs22-debian12 AS runtime
# FROM gcr.io/distroless/nodejs22-debian12:debug AS runtime

WORKDIR /app

COPY --from=build /app/.output/public ./.output/public
COPY --from=build /app/.output/server ./.output/server

ENV NODE_ENV=production

ENV HOSTNAME=0.0.0.0
ENV PORT=3000

EXPOSE 3000

CMD ["/app/.output/server/index.mjs"]
